/**
 * @class Oskari.userinterface.component.Grid
 *
 * Renders given data model as a grid/table. Provides sorting funtionality.
 * If table data is structured to have "inner tables" -> #setAdditionalDataHandler
 * method can be used to set a callback which will show the additional data externally
 * to keep the table clean.
 */
Oskari.clazz.define('Oskari.userinterface.component.Grid',
    /**
     * @static @method create called automatically on construction
     */
    function () {
        this.model = null;
        this._defaultLocKey = 'Grid';
        this._loc = this._getLocalization('DivManazer');
        this.template = jQuery(
            '<table class="oskari-grid"><thead><tr></tr></thead><tbody></tbody></table>'
        );
        this.templateTableHeader = jQuery(
            '<th><a href="JavaScript:void(0);"></a></th>'
        );
        this.templateTableGroupingHeader = jQuery('<th class="grouping"><div class="paging previous"></div><div class="title"></div><div class="paging next"></div></th>');
        this.templateDiv = jQuery('<div></div>');
        this.templateRow = jQuery('<tr></tr>');
        this.templateCell = jQuery('<td></td>');
        this.templatePopupLink = jQuery('<a href="JavaScript: void(0);"></a>');
        this.templateTabTools = jQuery('<div class="tab-tools"></div>');
        this.templateExporter = jQuery('<div class="exporter"></div>');
        this.templateColumnSelectorTitle = jQuery(
            '<div class="column-selector-title"></div>'
        );
        this.templateColumnSelectorWrapper = jQuery('<div/>', {});
        this.templateColumnSelector = jQuery('<div/>', {});
        this.templateColumnSelectorList = jQuery('<ul/>', {});
        this.templateColumnSelectorListItem = jQuery('<li>' +
            '<div>' +
            '<input type="checkbox" class="oskari-divmanazer-component-grid"/>' +
            '<label></label>' +
            '</div>' +
            '</li>'
            );
        this.templateColumnSelectorClose = jQuery(
            '<div class="icon-close close-selector-button"></div>'
        );
        this.templateTool = jQuery('<div></div>');
        this.dataSource = null;
        this.metadataLink = null;
        this.exportButton = null;
        this.exportPopup = null;
        this.table = null;
        this.fieldNames = [];
        this.selectionListeners = [];
        this.additionalDataHandler = null;
        this.visibleColumnSelector = null;
        this.showColumnSelector = false;
        this.showExcelExporter = false;
        this.resizableColumns = false;
        this.autoHeightHeader = false;
        this.uiNames = {};
        this.columnTools = {};
        this.valueRenderer = {};

        /* last sort parameters are saved so we can change sort direction if the
         * same column is sorted again
         */
        this.lastSort = null;

        /** Grouping headers */
        this._groupingHeaders = null;

        /* Current page. Used to keep track current page when sorting cols */
        this._currentPage = {};

        Oskari.makeObservable(this);
    }, {
        /**
         * @method setDataModel
         * Sets the data model the grid uses for rendering
         *
         * @param {Oskari.userinterface.component.GridModel} pData
         */
        setDataModel: function (pData) {
            this.model = pData;
        },
        /**
         * @method getDataModel
         * Returns the data model the grid uses for rendering
         *
         * @return {Oskari.userinterface.component.GridModel}
         */
        getDataModel: function () {
            return this.model;
        },
        /**
         * @public @method getDataSource
         *
         * @return {String} Datasource
         */
        getDataSource: function () {
            return this.dataSource;
        },
        /**
         * @public @method setDataSource
         *
         * @param {String} Datasource
         */
        setDataSource: function (dataSource) {
            this.dataSource = dataSource;
        },
        /**
         * @public @method getMetadataLink
         *
         * @return {String} Metadata link
         */
        getMetadataLink: function () {
            return this.metadataLink;
        },
        /**
         * @public @method setMetadataLink
         *
         * @param {String} Metadata link
         */
        setMetadataLink: function (metadataLink) {
            this.metadataLink = metadataLink;
        },
        /**
         * @method setColumnSelector
         * Sets the column selector visible or invisible
         *
         * @param {Boolean} newShowColumnSelector
         * Truth value for showing a column selector
         */
        setColumnSelector: function (newShowColumnSelector) {
            this.showColumnSelector = newShowColumnSelector;
        },
        /**
         * @method setExcelExporter
         * Sets the Excel exporter visible or invisible
         *
         * @param {Boolean} newShowExcelExporter
         * Truth value for showing an Excel exporter
         */
        setExcelExporter: function (newShowExcelExporter) {
            this.showExcelExporter = newShowExcelExporter;
        },
        /**
         * @method setResizableColumns
         * Sets the columns resizable or static
         *
         * @param {Boolean} newResizableColumns
         * Truth value for column resizability
         */
        setResizableColumns: function (newResizableColumns) {
            this.resizableColumns = newResizableColumns;
        },
        /**
         * @method  setAutoHeightHeader
         * Sets the header table autosizeble
         * @param {Integer} margin is setted some margin then autosize header
         */
        setAutoHeightHeader: function(margin) {
            if(typeof margin === 'number') {
                this.autoHeightHeader = margin;
            }
        },
        /**
         * @method setColumnUIName
         * Sets an UI text for a given field.
         * The grid shows the UI name instead of the datas field name
         *
         * @param {String} fieldName field name we want to replace in UI
         * @param {String} uiName field name we want to use instead in UI
         */
        setColumnUIName: function (fieldName, uiName) {
            this.uiNames[fieldName] = uiName;
        },
        /**
         * @method setColumnTools
         * Sets tools that should be shown on column
         *
         * @param {String} fieldName field name we want to replace in UI
         * @param {Object[]} listOfTools tools that should be rendered for the column
         */
        setColumnTools: function (fieldName, listOfTools) {
            this.columnTools[fieldName] = listOfTools;
        },
        /**
         * @method setColumnValueRenderer
         * When rendering the field value the given renderer function is called
         * if given.
         * The function takes the value as parameter and should return the
         * processed value:
         * function({String} value, {Object} rowData) {
         *     return value;
         * }
         * RowData parameter includes the object being rendered including
         * the value so renderer has access to id and such.
         *
         * @param {String} fieldName
         * Field name we want to process before showing in ui
         * @param {String} renderer function that will process the value
         */
        setColumnValueRenderer: function (fieldName, renderer) {
            this.valueRenderer[fieldName] = renderer;
        },
        /**
         * @method  @public getVisibleFields Get visible fields
         * @return {String[]} field names array
         */
        getVisibleFields: function () {
            return this.fieldNames;
        },
        /**
         * @method setVisibleFields
         * If not given renders all data fields
         *
         * @param {String[]} pFieldNames
         * Fieldnames that should be rendered from data
         */
        setVisibleFields: function (pFieldNames) {
            this.fieldNames = pFieldNames;
        },
        /**
         * @method addSelectionListener
         * The callback function will receive reference to the grid in question
         * as first parameter and the id for the selected data as second
         * parameter:
         * function({Oskari.userinterface.component.Grid} grid, {String} dataId)
         *
         * @param {function} pCallback
         * Callback to call when a row has been selected
         *
         */
        addSelectionListener: function (pCallback) {
            this.selectionListeners.push(pCallback);
        },
        /**
         * @private @method _createSubTable
         * Creates columns from a subtable object.
         *
         * @param {jQuery} row current row
         * @param {Number} columnIndex current column index
         * @param {String} key object key
         * @param {Object} value object value
         */
        _createSubTable: function (row, columnIndex, key, value) {
            var baseKey,
                subKeys,
                hidden,
                found,
                field,
                cell,
                index;

            cell = this.templateCell.clone();
            baseKey = key;
            index = columnIndex;
            subKeys = this.table.find('th');
            hidden = jQuery(this.table.find('th')[index]).hasClass('closedSubTable');
            cell.addClass('base');
            cell.addClass(baseKey);
            row.append(cell);
            index = index + 1;
            do {
                if (index === subKeys.length) {
                    break;
                }
                found = false;
                // Let's not assume field order
                for (field in value) {
                    if (value.hasOwnProperty(field) && (jQuery(subKeys[index]).data('key') === baseKey) && (jQuery(subKeys[index]).data('value') === field)) {
                        cell = this.templateCell.clone();
                        cell.addClass(baseKey);
                        if (_.isArray(value[field])) {
                            cell.append(value[field][0]);
                        } else {
                            cell.append(value[field]);
                        }
                        if (hidden) {
                            cell.addClass('hidden');
                        }
                        row.append(cell);
                        index = index + 1;
                        found = true;
                        break;
                    }
                }
            } while (found);
            return index;
        },
        /**
         * @method setAdditionalDataHandler
         * If grid data has internal table structures, it can be hidden behind a
         * link by using this method. This way the grid stays more clear.
         *
         * @param {String} title text for the link
         * @param {function} handler callback to call when the link is clicked
         */
        setAdditionalDataHandler: function (title, handler) {
            this.additionalDataHandler = {
                title: title,
                handler: handler
            };
        },
        /**
         * @private @method _createAdditionalDataField
         * Renders the given data using #_renderAdditionalData() and wraps it
         * with a linked callback if #setAdditionalDataHandler() has been used.
         *
         * @param {Object[]} data data to be rendered
         *
         * @return (jQuery) reference to rendered content
         */
        _createAdditionalDataField: function (data) {
            if (!data || jQuery.isEmptyObject(data)) {
                return false;
            }
            var me = this,
                content = me._renderAdditionalData(data),
                link;
            // if handler set -> show link instead
            // exception if data is an array (=has size method)
            if (!data.size && me.additionalDataHandler) {
                link = me.templatePopupLink.clone();
                link.append(me.additionalDataHandler.title);
                link.bind('click', function () {
                    // show userguide popup with data
                    me.additionalDataHandler.handler(link, content);
                    return false;
                });
                return link;
            }
            return content;

        },
        /**
         * @private @method _renderAdditionalData
         * Renders the given data to a table or comma separated list depending
         * on type.
         *
         * @param {Object[]} data data to be rendered
         *
         * @return (jQuery) reference to rendered content
         */
        _renderAdditionalData: function (data) {
            var me = this,
                table = me.template.clone(),
                body = table.find('tbody'),
                value,
                row,
                fieldCell,
                valueCell,
                valueDiv,
                type,
                innerTable,
                i,
                field;

            if (data.size) {
                // array data
                value = '';
                for (i = 0; i < data.size(); i += 1) {
                    if (i !== 0) {
                        value = value + ', ';
                    }
                    value = value + data[i];
                }
                return value;
            }

            // format array
            if (jQuery.isArray(data)) {
                valueDiv = me.templateDiv.clone();
                for (i = 0; i < data.length; i += 1) {
                    innerTable = me._renderAdditionalData(data[i]);
                    valueDiv.append(innerTable);
                }
                return valueDiv;
            }

            // else format as table
            for (field in data) {
                if (data.hasOwnProperty(field)) {
                    row = me.templateRow.clone();
                    fieldCell = me.templateCell.clone();
                    valueCell = me.templateCell.clone();
                    value = data[field];
                    fieldCell.append(field);
                    row.append(fieldCell);

                    type = typeof value;
                    if (type === 'object') {
                        innerTable = me._renderAdditionalData(value);
                        valueCell.append(innerTable);
                    } else if (type !== 'function') {
                        valueCell.append(value);
                    }
                    row.append(valueCell);
                    body.append(row);
                }
            }
            return table;
        },

        /**
         * Set grouping headers for Grid
         * @method  @public addGroupingHeader
         * @param {Array} headers array of groupung header objects [{cls:'styleClass', text:'Grouping text'}]
         */
        setGroupingHeader: function(headers) {
            this._groupingHeaders = headers;
        },

        /**
         * @method  @private _selectActivePage Select active to visible page
         */
        _selectActivePage: function(){
            var me = this;
            // Safety checks
            if(!this.table || !me._groupingHeaders) {
                return;
            }
            var selected = this.table.find('th.selected');
            if(!selected.is(':visible')) {
                var colIndex = this.table.find('tr th:not(.grouping)').index(selected);
                var cols = 0;

                // Resolve wanted page to visible
                selected.parent().parent().find('tr.grouping th').each(function(){
                    var groupHeader = jQuery(this);
                    if(!groupHeader.attr('colspan')){
                        cols++;
                    } else {
                        cols += Number(groupHeader.attr('colspan'));
                    }
                    var maxCols = Number(groupHeader.attr('data-max-cols'));
                    var groupStartCol = Number(groupHeader.attr('data-start-col'));

                    // Founded matching group header
                    if(colIndex < cols && colIndex + 1 >= groupStartCol && !!maxCols) {
                        // resolve wanted page
                        var wantedPage = (colIndex - (colIndex % maxCols)) / maxCols;
                        if(colIndex % maxCols > 0) {
                            wantedPage += 1;
                        }
                        groupHeader.attr('data-page',wantedPage);
                        me._changePage(groupHeader);
                    }
                });
            }
        },

        /**
         * @method  @private _changePage  Change page
         * @param  {Object} groupHeader group header
         */
        _changePage: function(groupHeader){
            var me = this;

            if(me._groupingHeaders && groupHeader.attr('data-group-cols')) {
                var page = Number(groupHeader.attr('data-page'));
                var groupIndex = groupHeader.attr('data-header-index');
                me._currentPage[groupIndex] = page;
                var maxCols = Number(groupHeader.attr('data-max-cols'));
                var maxPages = Number(groupHeader.attr('data-max-page'));
                var groupCols = Number(groupHeader.attr('data-group-cols'));
                var groupStartCol = Number(groupHeader.attr('data-start-col'));
                var table = groupHeader.parents('table');
                var next = groupHeader.find('.paging.next');
                var previous = groupHeader.find('.paging.previous');
                var c;

                // hide grouping cols
                for(var i=groupStartCol;i<groupCols+groupStartCol;i++){
                    var content = table.find('tr th:not(.grouping):nth-child('+i+') ,td:not(.grouping):nth-child('+i+')');
                    content.hide();
                }

                var pagingHandler = function(groupHeader, data) {
                    var headerIndex = Number(groupHeader.attr('data-header-index'));
                    var header = me._groupingHeaders[headerIndex];
                    // If header has paging handler then do it
                    if(typeof header.pagingHandler === 'function') {
                        header.pagingHandler(groupHeader.find('.title'), data);
                    }
                    // otherwise show default text, for example: "2-4/5"
                    else if(!header.text) {
                        groupHeader.find('.title').html(data.visible.start + '-' + data.visible.end + '/' + data.count);
                    }
                };

                // Check buttons visibility
                var checkPagingButtonsVisiblity = function(){
                    var page = Number(groupHeader.attr('data-page'));
                    var next = groupHeader.find('.paging.next');
                    var previous = groupHeader.find('.paging.previous');
                    next.removeClass('hidden');
                    previous.removeClass('hidden');
                    if(page===1) {
                        previous.addClass('hidden');
                    } else if(page === Number(groupHeader.attr('data-max-page'))){
                        next.addClass('hidden');
                    }
                };

                var visibleCols = Array.apply(null, {length: groupCols}).map(Number.call, Number);

                // Get visible cols and shows them
                // If page is first then show only first cols
                if(page === 1) {
                    visibleCols = visibleCols.slice(0, maxCols);
                }
                // else page is latest
                else if (page === maxPages) {
                    visibleCols = visibleCols.slice(Math.max(groupCols - maxCols, 1));
                }
                // else page is between first and latest
                else {
                    visibleCols = visibleCols.slice((page-1) * maxCols, page * maxCols);
                }

                // Show page cols
                visibleCols.forEach(function(element){
                    var colIndex = element + groupStartCol;
                    var currentColEl = table.find('tr th:nth-child(' + colIndex + '):not(.grouping),td:nth-child(' + colIndex + '):not(.grouping)');
                    currentColEl.show();
                });


                if(visibleCols.length < groupCols) {
                    pagingHandler(groupHeader, {
                        visible: {
                            start: visibleCols[0] + 1,
                            end: visibleCols[visibleCols.length-1] + 1
                        },
                        count: groupCols,
                        page: page,
                        maxPages: maxPages
                    });

                    checkPagingButtonsVisiblity();
                }


            }
        },
        /**
         * @method  @private_checkPaging Check table paging
         * @param  {Object} table jQuery table dom
         */
        _checkPaging: function(table){
            var me = this;
            if(me._groupingHeaders) {
                // Paging handlers
                var prevHandler = function(evt) {
                    evt.stopPropagation();
                    var groupHeader = jQuery(this).parents('th.grouping');
                    var page = Number(groupHeader.attr('data-page')) - 1;
                    if(page < 1) {
                        page = 1;
                    }
                    groupHeader.attr('data-page', page);
                    me._changePage(groupHeader);
                };

                var nextHandler = function(evt) {
                    evt.stopPropagation();
                    var groupHeader = jQuery(this).parents('th.grouping');
                    var page = Number(groupHeader.attr('data-page')) + 1;
                    if(page > groupHeader.attr('data-max-page')) {
                        page = groupHeader.attr('data-max-page');
                    }
                    groupHeader.attr('data-page', page);
                    me._changePage(groupHeader);
                };
                table.find('th.grouping').each(function(){
                    var groupHeader = jQuery(this);
                    var groupCols = groupHeader.attr('colspan') ?  Number(groupHeader.attr('colspan')) :  1;
                    var maxCols = groupHeader.attr('data-max-cols');
                    var next = groupHeader.find('.paging.next');
                    var previous = groupHeader.find('.paging.previous');
                    if(!!maxCols && groupCols > maxCols){
                        if(me._groupingHeaders.length > 1 && i === 0) {
                            next.addClass('hidden');
                        } else if(me._groupingHeaders.length > 1 && i > 0) {
                            previous.addClass('hidden');
                        }

                        var maxPage = (groupCols - (groupCols % maxCols)) / maxCols;
                        if(groupCols % maxCols > 0) {
                            maxPage += 1;
                        }
                        groupHeader.attr('data-group-cols', groupCols);
                        groupHeader.attr('data-max-page', maxPage);
                        groupHeader.attr('data-page', maxPage);

                        var groupIndex = groupHeader.attr('data-header-index');

                        // Bind events
                        next.unbind('click');
                        next.bind('click', nextHandler);
                        previous.unbind('click');
                        previous.bind('click', prevHandler);

                        if(me._currentPage[groupIndex]) {
                            groupHeader.attr('data-page', me._currentPage[groupIndex]);
                            // release current page information
                            delete me._currentPage[groupIndex];
                        }

                        me._changePage(groupHeader);
                    } else {
                        next.remove();
                        previous.remove();
                    }
                });
            }
        },
        /**
         * @private @method _renderHeader
         * Renders the header part for data in #getDataModel() to the given
         * table.
         *
         * @param {jQuery} table
         * Reference to the table DOM element whose header should be populated
         * @param {String[]} fieldNames
         * Names of the fields to render in render order
         */
        _renderHeader: function (table, fieldNames) {
            var me = this,
                // print header
                headerContainer = table.find('thead tr'),
                tableHeader = table.find('thead'),
                bodyContainer = table.find('tbody'),
                i,
                header,
                link,
                dataArray,
                data,
                fullFieldNames,
                fieldName,
                baseKey,
                uiName,
                key,
                value,
                field,
                headerClosureMagic;

            // header reference needs some closure magic to work here
            headerClosureMagic = function (scopedValue) {
                return function () {
                    me.trigger('column.selected', scopedValue);
                    // reference to sort link element
                    var linky = jQuery(this),
                        // get previous selection
                        selection = me.getSelection(),
                        // default to descending sort
                        descending = false,
                        idField,
                        j;
                    // clear table for sorted results
                    bodyContainer.empty();
                    // if last sort was made on the same column -> change direction
                    if (me.lastSort && me.lastSort.attr === scopedValue) {
                        descending = !me.lastSort.descending;
                    }
                    // sort the results
                    me._sortBy(scopedValue, descending);
                    // populate table content
                    me._renderBody(table, fieldNames);
                    // apply visual changes
                    headerContainer.find('th').removeClass('asc');
                    headerContainer.find('th').removeClass('desc');
                    if (descending) {
                        linky.parent().addClass('desc');
                    } else {
                        linky.parent().addClass('asc');
                    }
                    // reselect selection
                    idField = me.model.getIdField();
                    for (j = 0; j < selection.length; j += 1) {
                        me.select(selection[j][idField], true);
                    }
                    me.trigger('sort', {
                        column : scopedValue,
                        ascending : !descending
                    });
                    return false;
                };
            };
            // Expand the table
            dataArray = me.model.getData();
            if (dataArray.length === 0) {
                return;
            }
            fullFieldNames = [];
            data = dataArray[0];
            for (i = 0; i < fieldNames.length; i += 1) {
                key = fieldNames[i];
                value = data[key];
                if (typeof value === 'object') {
                    fullFieldNames.push(
                        {
                            key: key,
                            baseKey: key,
                            subKey: key,
                            type: 'object',
                            visibility: 'shown'
                        }
                    );
                    for (field in value) {
                        if (value.hasOwnProperty(field)) {
                            if (dataArray.length > 2) {
                                fullFieldNames.push(
                                    {
                                        key: key + '.' + field,
                                        baseKey: key,
                                        subKey: field,
                                        type: 'default',
                                        visibility: 'hidden'
                                    }
                                );
                            } else {
                                fullFieldNames.push(
                                    {
                                        key: key + '.' + field,
                                        baseKey: key,
                                        subKey: field,
                                        type: 'default',
                                        visibility: 'shown'
                                    }
                                );
                            }
                        }
                    }
                } else {
                    fullFieldNames.push(
                        {
                            key: key,
                            baseKey: key,
                            subKey: field,
                            type: 'default',
                            visibility: 'shown'
                        }
                    );
                }
            }

            var headerLinkClosureMagic = function () {
                var parentItem = jQuery(this).parent(),
                    thisKey = parentItem.data('key');

                if (parentItem.hasClass('closedSubTable')) {
                    table.find('th.hidden.' + thisKey).removeClass('hidden');
                    table.find('td.hidden.' + thisKey).removeClass('hidden');
                    parentItem.removeClass('closedSubTable');
                    parentItem.addClass('openSubTable');
                } else {
                    table.find('th.' + thisKey).not('.base').addClass('hidden');
                    table.find('td.' + thisKey).not('.base').addClass('hidden');
                    parentItem.removeClass('openSubTable');
                    parentItem.addClass('closedSubTable');
                }
            };

            if(me._groupingHeaders) {
                var cols = 0;
                var row = jQuery('<tr class="grouping"></tr>');
                for(i =0; i < me._groupingHeaders.length; i+= 1) {
                    var h = me._groupingHeaders[i];
                    var groupHeader = me.templateTableGroupingHeader.clone();
                    if(typeof h.cls === 'string') {
                        groupHeader.addClass(h.cls);
                    }
                    if(typeof h.text === 'string'){
                        groupHeader.find('.title').html(h.text);
                    }

                    if(typeof h.colspan === 'number') {
                        groupHeader.attr('colspan', h.colspan);
                        cols += h.colspan;
                    } else {
                        cols++;
                    }

                    // Check last grouping header cell
                    if(i === me._groupingHeaders.length-1 && cols < fullFieldNames.length && !h.colspan) {
                        var lastColspan = (fullFieldNames.length - cols) + 1;
                        groupHeader.attr('colspan', lastColspan);
                    }

                    if(h.maxCols) {
                        groupHeader.attr('data-max-cols', h.maxCols);
                        groupHeader.attr('data-start-col', cols);
                        groupHeader.attr('data-header-index', i);
                    }

                    row.append(groupHeader);
                }
                tableHeader.prepend(row);
            }


            for (i = 0; i < fullFieldNames.length; i += 1) {
                header = me.templateTableHeader.clone();
                link = header.find('a');
                fieldName = fullFieldNames[i].key;
                baseKey = fullFieldNames[i].baseKey;
                uiName = me.uiNames[baseKey];

                if(typeof uiName === 'function') {
                    uiName(header);
                } else {

                    var tools = this.columnTools[baseKey] || [];
                    if (!uiName) {
                        uiName = fieldName;
                    } else if (fieldName !== fullFieldNames[i][key]) {
                        uiName = fieldName.replace(baseKey, uiName);
                    }
                    link.append(uiName);
                    header.attr('title',uiName);
                    if (me.lastSort && fieldName === me.lastSort.attr) {
                        if (me.lastSort.descending) {
                            header.addClass('desc');
                        } else {
                            header.addClass('asc');
                        }
                    }
                    if (fullFieldNames[i].type === 'default') {
                        link.bind('click', headerClosureMagic(fullFieldNames[i].key));
                        me.__attachHeaderTools(header, tools, fullFieldNames[i].key);
                    } else if (fullFieldNames[i].type === 'object') {
                        if (dataArray.length > 2) {
                            header.addClass('closedSubTable');
                            header.addClass('base');
                        } else {
                            header.addClass('openSubTable');
                            header.addClass('base');
                        }
                        // Expand or close subtable
                        link.bind('click', headerLinkClosureMagic);
                    }

                    if (fullFieldNames[i].visibility === 'hidden') {
                        header.addClass('hidden');
                    }
                }

                header.data('key', fullFieldNames[i].baseKey);
                header.data('value', fullFieldNames[i].subKey);

                header.addClass(this.__getHeaderClass(fullFieldNames[i].baseKey));
                if(me.__selectedColumn === fullFieldNames[i].baseKey) {
                    header.addClass('selected');
                }
                headerContainer.append(header);
            }
        },
        /**
         * Format value to usable css class.
         * @param  {String} value column field name
         * @return {String}       value with problematic characters removed/replaced
         */
        __getHeaderClass : function(value) {
            if(!value) {
                return value;
            }
            // replace " with empty string so html doesn't break
            var result = value.split("\"").join("");
            result = result.split(":").join("");
            result = result.split(",").join("_");
            result = result.split(".").join("_");
            result = result.split("{").join("_");
            result = result.split("}").join("_");
            return result;
        },
        /**
         * Adds any tools the user might have configured to the column header
         * @param  {jQuery} header container to add to
         * @param  {Object[]} tools  array of items with name and callback
         * @param  {String} field  column name for the callback parameter
         */
        __attachHeaderTools : function(header, tools, field) {
            var me = this;
            tools.forEach(function(tool) {
                var tpl = me.templateTool.clone();
                tpl.append(tool.name);
                if(tool.callback) {
                    tpl.on('click', function() {
                        tool.callback(field);
                    });
                }
                header.append(tpl);
            });
        },

        /**
         * @private @method _renderBody
         * Renders the data in #getDataModel() to the given table.
         *
         * @param {jQuery} table reference to the table DOM element whose body should be populated
         * @param {String[]} fieldNames names of the fields to render in render order
         */
        _renderBody: function (table, fieldNames) {
            var me = this,
                // print data
                body = table.find('tbody'),
                dataArray = me.model.getData(),
                i,
                row,
                data,
                f,
                key,
                value,
                cell,
                columnIndex,
                renderer,
                rows,
                rowClicked;

            for (i = 0; i < dataArray.length; i += 1) {
                row = me.templateRow.clone();
                data = dataArray[i];

                row.attr('data-id', data[me.model.getIdField()]);
                columnIndex = 0;
                for (f = 0; f < fieldNames.length; f += 1) {
                    key = fieldNames[f];
                    value = data[key];
                    // Handle subtables
                    if (typeof value === 'object') {
                        columnIndex = me._createSubTable(
                            row,
                            columnIndex,
                            key,
                            value
                        );
                        // cell.append(this._createAdditionalDataField(value)); // old version
                    } else {
                        cell = me.templateCell.clone();
                        renderer = me.valueRenderer[key];
                        if (renderer) {
                            value = renderer(value, data);
                        }
                        cell.append(value);
                        row.append(cell);
                        columnIndex = columnIndex + 1;
                    }
                }
                body.append(row);
            }
            rows = table.find('tbody tr');
            rowClicked = function () {
                me._dataSelected(jQuery(this).attr('data-id'));
            };
            rows.bind('click', rowClicked);
            // enable links to work normally (unbind row click on hover and rebind when mouse exits)
            rows.find('a').hover(function () {
                jQuery(this).parents('tr').unbind('click');
            }, function () {
                jQuery(this).parents('tr').bind('click', rowClicked);
            });

            me._checkPaging(table);
        },
        /**
         * @private @method _renderColumnSelector
         * Renders the column selector for the given table.
         *
         * @param {jQuery} table reference to the table DOM element
         * @param {String[]} fieldNames names of the fields to select visible
         *
         */
        _renderColumnSelector: function (table, fieldNames) {
            // Utilize the templates
            var me = this,
                columnSelectorLabel = me.templateColumnSelectorTitle.clone(),
                columnSelector = me.templateColumnSelector.clone(),
                columnSelectorList = me.templateColumnSelectorList.clone(),
                columnSelectorClose = me.templateColumnSelectorClose.clone(),
                fields,
                visibleField,
                i,
                j,
                newColumn,
                checkboxInput;

            me.visibleColumnSelector = me.templateColumnSelectorWrapper.clone();
            me.visibleColumnSelector.addClass('column-selector-placeholder');
            columnSelector.addClass('column-selector');
            columnSelectorLabel.append(me._loc.columnSelector.title);
            me.visibleColumnSelector.append(columnSelectorLabel);
            me.visibleColumnSelector.append(columnSelector);

            // FIXME check this how can be more spefied selctor?
            jQuery('input.oskari-divmanazer-component-grid').remove();
            // Open or close the checkbox dropdown list
            me.visibleColumnSelector.click(function () {
                if (columnSelector.css('visibility') !== 'hidden') {
                    columnSelector.css('visibility', 'hidden');
                } else {
                    columnSelector.css('visibility', 'visible');
                }
            });
            columnSelectorClose.click(function (e) {
                e.stopPropagation();
                columnSelector.css('visibility', 'hidden');
            });
            fields = me.model.getFields();

            var checkbocInputChange = function () {
                    var fieldSelectors = jQuery(
                            'input.column-selector-list-item'
                        ),
                        oldFields = me.model.getFields(),
                        newFields = [],
                        k,
                        l;

                    for (k = 0; k < oldFields.length; k += 1) {
                        for (l = 0; l < fieldSelectors.length; l += 1) {
                            if (oldFields[k] === fieldSelectors[l].id) {
                                if (fieldSelectors[l].checked) {
                                    newFields.push(oldFields[k]);
                                }
                                break;
                            }
                        }
                    }
                    if (newFields.length > 0) {
                        me.setVisibleFields(newFields);
                    }
                    me.renderTo(table.parent(), {
                        columnSelector: 'open'
                    });
                };

            // Add field names to the list
            for (i = 0; i < fields.length; i += 1) {
                visibleField = false;
                // Set current checkbox value for the field
                for (j = 0; j < fieldNames.length; j += 1) {
                    if (fields[i] === fieldNames[j]) {
                        visibleField = true;
                        break;
                    }
                }
                newColumn = me.templateColumnSelectorListItem.clone();
                newColumn.addClass('column-selector-list-item');
                checkboxInput = newColumn.find('input');
                checkboxInput.attr('checked', visibleField);
                checkboxInput.addClass('column-selector-list-item');
                checkboxInput.attr('id', fields[i]);
                newColumn.find('label')
                    .attr({
                        'for': fields[i],
                        'class': 'column-label'
                    })
                    .html(fields[i]);
                newColumn.css({
                    'margin': '5px'
                });

                // Update visible fields after checkbox change
                checkboxInput.change(checkbocInputChange);
                columnSelectorList.append(newColumn);
            }
            columnSelectorList.attr('class', 'column-selector-list');
            columnSelector.append(columnSelectorList, columnSelectorClose);
            columnSelectorClose.click(function (e) {
                e.stopPropagation();
                columnSelector.css('visibility', 'hidden');
            });
        },
        /**
         * @private @method _enableColumnResizer
         * Enables column resizing functionality
         */
        _enableColumnResizer: function () {
            var pressed = false,
                start,
                startX,
                startWidth,
                featureTable = jQuery('table.oskari-grid th');

            featureTable.css('cursor', 'e-resize');

            // Start resizing
            featureTable.mousedown(function (e) {
                start = jQuery(this);
                pressed = true;
                startX = e.pageX;
                startWidth = jQuery(this).width();
                jQuery(start).addClass('resizing');
                // Disable mouse selecting
                jQuery(document).attr('unselectable', 'on')
                    .css('user-select', 'none')
                    .on('selectstart', false);
            });

            // Resize when mouse moves
            jQuery(document).mousemove(function (e) {
                if (pressed) {
                    jQuery(start).width(startWidth + (e.pageX - startX));
                }
            });

            // Stop resizing
            jQuery(document).mouseup(function () {
                if (pressed) {
                    jQuery(start).removeClass('resizing');
                    pressed = false;
                }
            });
        },

        /**
         * @method renderTo
         * Renders the data in #getDataModel() to the given DOM element.
         *
         * @param {jQuery} container
         * Reference to DOM element where the grid should be inserted.
         * @param {Object} state
         * Tells into what state we are going to render this grid
         * (e.g. columnSelector: open tells that we want to show columnselector)
         */
        renderTo: function (container, state) {
            var me = this,
                toolRow,
                fieldNames,
                table;

            container.empty();

            // Tool row
            if ((me.showColumnSelector) || (me.showExcelExporter)) {
                toolRow = me.templateTabTools.clone();
                container.parent().children('.tab-tools').remove();
                container.parent().prepend(toolRow);
            }

            fieldNames = me.fieldNames;
            table = me.template.clone();
            // if visible fields not given, show all
            if (fieldNames.length === 0) {
                fieldNames = me.model.getFields();
            }

            me.table = table;
            me._renderHeader(table, fieldNames);

            if (me.lastSort) {
                // sort with last know sort when updating data
                me._sortBy(me.lastSort.attr, me.lastSort.descending);
            }
            me._renderBody(table, fieldNames);

            if (me.showColumnSelector) {
                me._renderColumnSelector(table, fieldNames);
                container.parent().find('.tab-tools').append(me.visibleColumnSelector);
                if (state !== null && state !== undefined && state.columnSelector === 'open') {
                    me.visibleColumnSelector.find('.column-selector').css('visibility', 'visible');
                }
            }

            // Exporter
            if (me.showExcelExporter) { // Todo: configure this
                var exporter = me.templateExporter.clone(),
                    exportForm = me._createExportForm(),
                    exportPopupButton = Oskari.clazz.create(
                        'Oskari.userinterface.component.Button'
                    ),
                    cancelButton = Oskari.clazz.create(
                        'Oskari.userinterface.component.buttons.CancelButton'
                    ),
                    exportButton = Oskari.clazz.create(
                        'Oskari.userinterface.component.buttons.SubmitButton'
                    );

                cancelButton.setHandler(function () {
                    me.exportPopup.close(true);
                });

                exportButton.setPrimary(true);
                exportButton.setTitle(me._loc['export']['export']);
                exportButton.setHandler(function () {
                    var values = exportForm.getValues({});
                    values.data = me._getTableData(values.columns !== 'all', values.export_selection);

                    // data at the end of the file
                    var additionalInfo = [];
                    if(jQuery(exportForm.getElement().elements.dataSource).is(':checked')) {
                        additionalInfo.push({
                            type : 'datasource',
                            name : me._loc['export'].additional.dataSource,
                            value : exportForm.getElement().elements.dataSource.value
                        });
                    }
                    additionalInfo.push({
                        type : 'layerName',
                        name : me._loc['export'].additional.layerName,
                        value : me._getLayerName()
                    });
                    if(jQuery(exportForm.getElement().elements.metadata).is(':checked')) {
                        additionalInfo.push({
                            type : 'metadata',
                            name : me._loc['export'].additional.metadata,
                            value : exportForm.getElement().elements.metadata.value
                        });
                    }

                    exportForm.getElement().elements.filename.value = me._getLayerName();
                    exportForm.getElement().elements.additionalData.value = JSON.stringify(additionalInfo);
                    exportForm.getElement().elements.data.value = JSON.stringify(values.data);
                    exportForm.submit();
                    me.exportPopup.close(true);
                });

                exportPopupButton.setPrimary(true);
                exportPopupButton.setTitle(me._loc['export'].title);
                exportPopupButton.setHandler(function () {
                    me.exportPopup = Oskari.clazz.create(
                        'Oskari.userinterface.component.Popup'
                    );
                    // Selection state
                    jQuery(exportForm.getElement()).find('input[name=export_selection]').prop('disabled',me.getSelection().length === 0);
                    me.exportPopup.makeModal();

                    me.exportPopup.show(
                        me._loc['export'].title,
                        jQuery(exportForm.getElement()),
                        [cancelButton, exportButton]
                    );
                });
                exporter.append(exportPopupButton.getElement());

                container.parent().find('.tab-tools').append(exporter);
            }

            container.append(table);

            // autosize header
            if(typeof me.autoHeightHeader === 'number') {
                var maxHeight = 0;
                var thead = table.find('thead');
                var theadRow = table.find('thead tr:not(.grouping)');

                theadRow.find('th').each(function(){
                    var el = jQuery(this);
                    if(el.prop('scrollHeight')>maxHeight) {
                        maxHeight = el.prop('scrollHeight');
                    }
                });

                theadRow.css('height', (me.autoHeightHeader + maxHeight) + 'px');
            }

            if (me.resizableColumns) {
                me._enableColumnResizer();
            }
        },

        /**
         * @private @method _createExportForm
         * @return {Object} form
         */
        _createExportForm: function () {
            // TODO add checkboxes
            var form = Oskari.clazz.create('Oskari.userinterface.component.Form'),
                columns = Oskari.clazz.create('Oskari.userinterface.component.RadioButtonGroup'),
                format = Oskari.clazz.create('Oskari.userinterface.component.RadioButtonGroup'),
                delimiter = Oskari.clazz.create('Oskari.userinterface.component.RadioButtonGroup'),
                additional = Oskari.clazz.create('Oskari.userinterface.component.Fieldset'),
                input,
                filename,
                me = this,
                loc = me._loc['export'];

            form.addClass('oskari-grid-export');
            form.addClass('clearfix');
            form.setAction(
                Oskari.getSandbox().getAjaxUrl('ExportTableFile')
            );
            form.setMethod('POST');

            columns.setName('columns');
            columns.setTitle(loc.columns.title);
            columns.setOptions(
                [
                    {
                        title: loc.columns.visible,
                        value: 'visible'
                    },
                    {
                        title: loc.columns.all,
                        value: 'all'
                    }
                ]
            );
            columns.setValue('visible');

            delimiter.setName('delimiter');
            delimiter.setTitle(loc.delimiter.title);
            delimiter.setOptions(
                [
                    {
                        title: loc.delimiter.comma,
                        value: ','
                    },
                    {
                        title: loc.delimiter.semicolon,
                        value: ';'
                    },
                    {
                        title: loc.delimiter.tabulator,
                        value: 'tab'
                    }
                ]
            );
            delimiter.setValue(';');

            format.setName('format');
            format.setTitle(loc.format.title);
            format.setOptions(
                [
                    {
                        title: loc.format.xlsx,
                        value: 'XLSX'
                    },
                    {
                        title: loc.format.csv,
                        value: 'CSV'
                    }
                ]
            );
            format.setHandler(function (value) {
                delimiter.setEnabled(value === 'CSV');
            });
            format.setValue('XLSX');

            additional.setTitle(loc.additional.title);
            // Hackety hack, this should be made into CheckboxGroup.js
            additional.addClass('oskari-checkboxgroup');
            additional.addClass('oskari-formcomponent');

            input = Oskari.clazz.create(
                'Oskari.userinterface.component.CheckboxInput'
            );
            input.setName('dataSource');
            input.setTitle(loc.additional.dataSource);  // Doesn't go to backend in form submit
            input.setValue(this.getDataSource());
            input.setEnabled(!!this.getDataSource());
            input.setChecked(!!this.getDataSource());
            additional.addComponent(input);

            input = Oskari.clazz.create(
                'Oskari.userinterface.component.CheckboxInput'
            );
            input.setName('metadata');
            input.setTitle(loc.additional.metadata);
            input.setValue(this.getMetadataLink());
            input.setEnabled(!!this.getMetadataLink());
            input.setChecked(!!this.getMetadataLink());
            additional.addComponent(input);

            input = Oskari.clazz.create(
                'Oskari.userinterface.component.CheckboxInput'
            );
            input.setName('export_selection');
            input.setTitle(loc.additional.export_selection);
            input.setEnabled(me.getSelection().length > 1);
            input.setChecked(false);
            additional.addComponent(input);

            input = document.createElement('input');
            input.name = 'data';
            input.type = 'hidden';

            filename = document.createElement('input');
            filename.name = 'filename';
            filename.type = 'hidden';

            form.addComponent(format);
            form.addComponent(columns);
            form.addComponent(delimiter);
            form.addComponent(additional);
            form.getElement().appendChild(filename);

            var additionalDataJSON = document.createElement('input');
            additionalDataJSON.name = 'additionalData';
            additionalDataJSON.type = 'hidden';
            form.getElement().appendChild(additionalDataJSON);

            form.getElement().appendChild(input);

            return form;
        },

        /**
         * @private @method _dataSelected
         * Notifies all selection listeners about selected data.
         *
         * @param {String} dataId id for the selected data
         */
        _dataSelected: function (dataId) {
            var i;

            for (i = 0; i < this.selectionListeners.length; i += 1) {
                this.selectionListeners[i](this, dataId);
            }
        },
        /**
         * @method select
         * Tries to find an object from #getDataModel() using the the id given
         * as parameter "value".
         * Oskari.mapframework.bundle.featuredata.domain.GridModel.getIdField()
         * is used to determine the field which value is compared against.
         * If found, selects the corresponding row in the grid.
         *
         * @param {String} value id for the data to be selected
         * @param {Boolean} keepPrevious
         * True to keep previous selection, false to clear before selecting
         * @param {Object} scrollableElement If element defined then scroll grid to selected row. If scrollableELment is null then not scroll.
         */
        select: function (value, keepPrevious, scrollableElement) {
            var key = this.model.getIdField(),
                dataArray = this.model.getData(),
                index,
                rows,
                data;

            for (index = 0; index < dataArray.length; index += 1) {
                data = dataArray[index];
                if (data[key] === value) {
                    // found
                    break;
                }
            }
            rows = this.table.find('tbody tr');
            if (keepPrevious !== true) {
                rows.removeClass('selected');
            }
            jQuery(rows[index]).addClass('selected');

            if(scrollableElement) {
                scrollableElement.scrollTop(0);
                var row = scrollableElement.find('tr[data-id="'+value+'"]');
                if(row.length > 0) {
                    scrollableElement.scrollTop(row.position().top);
                }
            }
        },
        /**
         * @method removeSelections
         */
        removeSelections: function () {
            var rows = this.table.find('tbody tr');

            rows.removeClass('selected');
        },
        /**
         * @method getSelection
         * Returns current selection visible on grid.
         *
         * @return {Object[]}
         * Subset of #getDataModel() that is currently selected in grid
         */
        getSelection: function () {
            var dataArray = this.model.getData(),
                selection = [],
                rows = this.table.find('tbody tr'),
                i,
                row;

            for (i = 0; i < rows.length; i += 1) {
                row = jQuery(rows[i]);
                if (row.hasClass('selected')) {
                    selection.push(dataArray[i]);
                }
            }
            return selection;
        },
        /**
         * @method selectColumn
         * Sets "selected" class to the column header
         * @param {String} value id for the column to be selected
         */
        selectColumn: function (value) {
            // set selectedColumn in either case so render will use it immediately
            this.__selectedColumn = value;

            if(!this.table) {
                return;
            }
            // remove selection from headers
            this.table.find('th').removeClass('selected');
            // add selection to the one specified
            var selected = this.table.find('th.' + this.__getHeaderClass(value));
            selected.addClass('selected');

            this._selectActivePage();
        },

        /**
         * @method getTable
         * Returns the grid table.
         *
         * @return {Object} table for the grid data
         */
        getTable: function () {
            return this.table;
        },

        /**
         * @method setNumericField
         * @param {String} field Name of the column
         * @param {integer}
         * Adds column renderers for numeric columns, each renderer rendering
         * the numbers with the highest decimal count found in the column.
         */
        setNumericField: function (field, fixedCount) {
            var me = this,
                decimalCount = -1;
            this.setColumnValueRenderer(
                field,
                function (value) {
                    // Try 1st string - filter out values with leading 0 and no . in it
                    var parsedString = String(value),
                        parsed = parseFloat(value);
                    if(parsedString){
                        if(parsedString.indexOf("0") === 0 && parsedString.indexOf(".") === -1 ){
                            return value;
                        }
                    }
                    if (Oskari.util.isNumber(value)) {
                        if (decimalCount === -1) {
                            var fieldValues = _.pluck(me.getDataModel().data, field);
                            decimalCount = Oskari.util.decimals(fieldValues);
                        }
                        if(fixedCount){
                            if(!isNaN(fixedCount) && fixedCount < decimalCount){
                                decimalCount = fixedCount;
                            }
                        }
                        return parseFloat(parsed.toFixed(decimalCount));
                    } else {
                        return value;
                    }
                }
            );
        },
        /**
         * @private @method _getTableData
         *
         * @param {Boolean} visible Return only visible columns
         * @param {Boolean} selected Return only selected rows, if true
         *
         * @return {[][]}
         * Table data as a two dimensional array, first row is headers.
         */
        _getTableData: function (visible, selected) {
            var me = this,
                model = me.getDataModel(),
                data = model.getData(),
                rows = me.table.find('tbody tr'),
                fields = visible ? me.getVisibleFields() : model.getFields(),
                ret = [],
                row,
                i = 0;

            // Add headers
            ret.push([]);
            fields.forEach(function (field) {
                ret[0].push(me.uiNames[field] || field);
            });

            // Add data
            data.forEach(function (rowData) {
                row = [];
                if(selected) {
                    if (jQuery(rows[i]).hasClass('selected')) {
                        fields.forEach(function (field) {
                            row.push(me._prepareData(rowData[field]));
                        });
                        ret.push(row);
                    }
                }
                else {
                    fields.forEach(function (field) {
                        row.push(me._prepareData(rowData[field]));
                    });
                    ret.push(row);
                }
                i++;
            });

            return ret;
        },
        /**
         * @private @method _sortBy
         * Sorts the last search result by comparing given attribute on the search objects
         *
         * @param {String} pAttribute
         * Attributename to sort by (e.g. result[pAttribute])
         * @param {Boolean} pDescending true if sort direction is descending
         */
        _sortBy: function (pAttribute, pDescending) {
            if(!this.model) {
                return;
            }
            var me = this,
                dataArray = me.model.getData();
            if (dataArray.length === 0) {
                return;
            }
            this.lastSort = {
                attr: pAttribute,
                descending: pDescending
            };

            dataArray.sort(function (a, b) {
                if (typeof a[pAttribute] === 'object' ||
                    typeof b[pAttribute] === 'object') {
                    // not sorting objects
                    return 0;
                }

                var nameA = me._getAttributeValue(a, pAttribute);
                var nameB = me._getAttributeValue(b, pAttribute);

                var renderer = me.valueRenderer[pAttribute];
                if (renderer) {
                    nameA = renderer(nameA);
                    nameB = renderer(nameB);
                }

                return Oskari.util.naturalSort(nameA, nameB, pDescending);
            });
        },

        sortBy: function(scopedValue, descending) {
            if(!this.model) {
                return;
            }
            var me = this;
            // sort the results
            me._sortBy(scopedValue, descending);
            // populate table content
            var fieldNames = me.fieldNames;
            // if visible fields not given, show all
            if (fieldNames.length === 0) {
                fieldNames = me.model.getFields();
            }
            this.table.find('tbody').empty();
            me._renderBody(this.table, fieldNames);
            me.trigger('sort', {
                column : scopedValue,
                ascending : !descending
            });
        },

        /**
         * @private @method _getAttributeValue
         *
         * @param {Object} a
         * @param {String} pAttribute attributename
         *
         * @return {}
         */
        _getAttributeValue: function (a, pAttribute) {
            // to string so number will work also
            var nameA = a[pAttribute],
                numericValue,
                split = pAttribute.split('.'); // if not found, try subtable

            if (typeof nameA === 'undefined' && split.length > 1) {
                nameA = a[split[0]][split[1]];
            }
            if (!nameA && typeof nameA !== 'number') {
                nameA = '';
            } else if (nameA.toLowerCase) {
                nameA = nameA.toLowerCase();
            }

            if(Oskari.util.isNumber(nameA, true)) {
                nameA = parseFloat(nameA);
            }
            return nameA;
        },
        /**
         * @method _getLocalization
         * Returns the localization object for the given key.
         *
         * @param  {String} locKey
         *
         * @return {Object/null}
         */
        _getLocalization: function (locKey) {
            var locale = Oskari.getLocalization(locKey),
                ret = null;

            if (locale) {
                ret = locale[this._defaultLocKey];
            }
            return ret;
        },
        /**
         * @method _get Layer name (title of active tab header
         * @return {String/null}
         */
        _getLayerName: function () {
            return  jQuery('div.oskari-flyoutcontent.featuredata').find('li.active').text();
        },
        /**
         * Prepare column data for excel export
         * @param data
         * @returns {*}
         * @private
         */
        _prepareData: function (data) {
            if (data instanceof Date) {
                data = String(data);
            }
            else if (!isNaN(data)) {
                data = String(data);
            }
            return data;
        },
        //http://stackoverflow.com/questions/17067294/html-table-with-100-width-with-vertical-scroll-inside-tbody
        contentScroll : function(follow) {
            var me = this;
            if(this.__scrollSortFunc) {
                this.off('sort', this.__scrollSortFunc);
                this.__scrollSortFunc = null;
            }
            this.__scrollSortFunc = function() {
                me.contentScroll(follow);
            };
            this.on('sort', this.__scrollSortFunc);
            this.table.find('thead').css('display', 'block');
            this.table.find('tbody').css({
                'display' : 'block',
                'overflow' : 'auto'
            });
            var dataCells = this.table.find('tbody tr:first').children();
            this.table.find('thead tr').children().each(function(i, header) {
                jQuery(header).css({
                    'padding': '5px',
                    'width': '120px',
                    'max-width' : 'none'
                });
            });
            dataCells.each(function(i, cell) {
                jQuery(cell).css({
                    'padding': '5px',
                    'width': '120px',
                    'max-width' : 'none'
                });
            });
            var headerHeight = this.table.find('thead').height();
            var pixelsFromTop = me.table[0].getBoundingClientRect().top;
            var setHeight = function(force) {
                var newTop = me.table[0].getBoundingClientRect().top;
                if(!force && pixelsFromTop === newTop) {
                    return;
                }
                pixelsFromTop = newTop;
                var parentHeight = me.table.parent().parent().height();
                me.table.find('tbody').height((parentHeight-headerHeight-pixelsFromTop) + 'px');
            };
            setHeight(true);
            if(follow === true) {
                clearInterval(this.sizeInterval);
                this.sizeInterval = setInterval(setHeight, 1000);
            }
        }
    }
);
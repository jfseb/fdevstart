//import * as Promise from 'es6-shim';
"use strict";

var __extends = undefined && undefined.__extends || function () {
    var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function (d, b) {
        d.__proto__ = b;
    } || function (d, b) {
        for (var p in b) {
            if (b.hasOwnProperty(p)) d[p] = b[p];
        }
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
var __rest = undefined && undefined.__rest || function (s, e) {
    var t = {};
    for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    }if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0) t[p[i]] = s[p[i]];
    }return t;
};
var react_1 = require("react");
var React = require("react");
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var MAXWIDTH = 570;
var MINWIDTH = 30;
;
//types u = keyof IRecord;
var u = "appId";
/*
"appId",
            "AppKey",
            "AppName",
                "ApplicationComponent",
                "RoleName",
                "ApplicationType",
                "BSPName",
                "BSPApplicationURL",
                "releaseName",
                "BusinessCatalog",
*/
var columns = ['appId', "fiori intent", 'AppName', 'ApplicationComponent', "BSPName", "releaseName", "BusinessCatalog"];
//keyof IRecord[];
var columnsWidth = [{ id: 'appId',
    width: 50 }, "fiori intent", 'AppName', 'ApplicationComponent', "BSPName", "releaseName", "BusinessCatalog"];
var columnLabels = {};
columns.forEach(function (col) {
    columnLabels[col] = col;
});
var records = [{
    "fiori intent": "n/a",
    "appId": "F1766",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddd66777",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddd6ddddddddddddddddd6",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dd444444444dd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d99966424353999dfasfasfdd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d12342aaaa14413dddddd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d999999dddbbbbb66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dd55rwr5555dd6aerwerewr6",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d999911111222dd222299ddd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddd3ssss4123424266",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d999999ddadfffffffffffd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddd624124126",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17d999999314234312ddd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dddqweqwerqwerqwqwd66",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17drrrrwetwertd777dd66yyy",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}, {
    "fiori intent": "n/a",
    "appId": "F17dd888qrwrrwer8d6ewerwer6",
    "AppName": "Special G/L Posting",
    "ApplicationComponent": "FI-FIO-AR"
}];
/*
      ts timestamp primary key,
          recordno int not null,
          generations int not null,
          botid varchar(10) not null,
          userid varchar(40) not null,
          message varchar(1024) not null,
          response varchar(1024) not null,
          action varchar(512) not null,
          intent varchar(20) not null,
          conversationid varchar(40) not null,
          delta int not null,
          status varchar(10) not null,
          meta json
*/
records = window.bomdata || records;
function produceSearchResult(searchString) {
    var u = window.elastic;
    if (searchString) {
        if (u) {
            var r = u.search(searchString);
            return r.map(function (o) {
                return parseInt(o.ref);
            });
        }
    }
    return records.map(function (r, index) {
        return index;
    });
}
/*
select a bunch of requested indices,
*/
function fetch(input) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            console.log("search for: " + input);
            var indices = produceSearchResult(input);
            var recMap = [];
            var result = [];
            indices.forEach(function (i) {
                if (i >= 0) {
                    result.push({ i: i, data: records[i] });
                }
            });
            var res = {
                json: result,
                indexList: indices
            };
            resolve(res);
        }, 300);
    });
}
//================================================
var FakeObjectDataListStore = function () {
    function FakeObjectDataListStore( /*number*/size, records) {
        this.size = size || 0;
        this._cache = records || [];
        // this._cache = [];
    }
    FakeObjectDataListStore.prototype.createFakeRowObjectData = function ( /*number*/index) {
        var u = JSON.parse(JSON.stringify(records[index % 2]));
        u.appId = "aaa" + index;
        return u;
    };
    FakeObjectDataListStore.prototype.getObjectAt = function ( /*number*/index) {
        if (index < 0 || index > this.size) {
            return undefined;
        }
        if (this._cache[index] === undefined) {
            this._cache[index] = this.createFakeRowObjectData(index);
        }
        return this._cache[index];
    };
    /**
    * Populates the entire cache with data.
    * Use with Caution! Behaves slowly for large sizes
    * ex. 100,000 rows
    */
    FakeObjectDataListStore.prototype.getAll = function () {
        if (this._cache.length < this.size) {
            for (var i = 0; i < this.size; i++) {
                this.getObjectAt(i);
            }
        }
        return this._cache.slice();
    };
    FakeObjectDataListStore.prototype.getSize = function () {
        return this.size;
    };
    return FakeObjectDataListStore;
}();
//var FakeObjectDataListStore = require('./helpers/FakeObjectDataListStore');
var FixedDataTable = require('fixed-data-table');
var Table = FixedDataTable.Table,
    Column = FixedDataTable.Column,
    Cell = FixedDataTable.Cell;
var SortTypes = {
    ASC: 'ASC',
    DESC: 'DESC'
};
function reverseSortDirection(sortDir) {
    return sortDir === SortTypes.DESC ? SortTypes.ASC : SortTypes.DESC;
}
var SortHeaderCell = function (_super) {
    __extends(SortHeaderCell, _super);
    //onSortChange? : any;
    //sortDir : any;
    //columnKey : any;
    function SortHeaderCell(props) {
        var _this = _super.call(this, props) || this;
        _this._onSortChange = _this._onSortChange.bind(_this);
        _this._onQBEChange = _this._onQBEChange.bind(_this);
        return _this;
    }
    SortHeaderCell.prototype.render = function () {
        var _this = this;
        var _a = this.props,
            sortDir = _a.sortDir,
            children = _a.children,
            qbe = _a.qbe,
            props = __rest(_a, ["sortDir", "children", "qbe"]);
        // {...props}>
        return React.createElement(Cell, null, React.createElement("a", { onClick: this._onSortChange }, children, " ", sortDir ? sortDir === SortTypes.DESC ? '&#9660;↓' : '&#9650;↑' : ''), React.createElement("br", null), React.createElement("input", { type: "text", style: { width: "100%", borderLeftWidth: "0px" }, value: qbe, onChange: function onChange(e) {
                return _this._onQBEChange(e.target.value);
            } }));
    };
    SortHeaderCell.prototype._onQBEChange = function (newQBE) {
        if (this.props.onQBEChange) {
            this.props.onQBEChange(this.props.columnKey, newQBE);
        }
    };
    SortHeaderCell.prototype._onSortChange = function (e) {
        e.preventDefault();
        if (this.props.onSortChange) {
            this.props.onSortChange(this.props.columnKey, this.props.sortDir ? reverseSortDirection(this.props.sortDir) : SortTypes.DESC);
        }
    };
    return SortHeaderCell;
}(React.Component);
var TextCell = function TextCell(_a) {
    var rowIndex = _a.rowIndex,
        data = _a.data,
        columnKey = _a.columnKey,
        props = __rest(_a, ["rowIndex", "data", "columnKey"]);
    return React.createElement(Cell, __assign({ title: data.getObjectAt(rowIndex)[columnKey] }, props), React.createElement("div", { title: data.getObjectAt(rowIndex)[columnKey] }, data.getObjectAt(rowIndex)[columnKey], " "));
};
var DataListWrapper = function () {
    function DataListWrapper(indexMap, data) {
        this._indexMap = indexMap || [];
        this._data = data;
    }
    DataListWrapper.prototype.getSize = function () {
        return this._indexMap.length;
    };
    DataListWrapper.prototype.getObjectAt = function (index) {
        return this._data.getObjectAt(this._indexMap[index]);
    };
    return DataListWrapper;
}();
var MyLinkCell = function (_super) {
    __extends(MyLinkCell, _super);
    function MyLinkCell() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MyLinkCell.prototype.render = function () {
        var _a = this.props,
            rowIndex = _a.rowIndex,
            field = _a.field,
            data = _a.data,
            label = _a.label,
            props = __rest(_a, ["rowIndex", "field", "data", "label"]);
        var record = data.getObjectAt(rowIndex);
        var cellurl = record[field];
        var celllabel = record[label];
        return React.createElement(Cell, __assign({}, props), React.createElement("a", { href: cellurl, target: "_blank" }, " A ", celllabel));
    };
    return MyLinkCell;
}(React.Component);
function getClientRect() {
    var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight || e.clientHeight || g.clientHeight;
    return { height: y, width: x };
}
;
var SortExample = function (_super) {
    __extends(SortExample, _super);
    //  _dataList: any;
    //  state: any;
    function SortExample(props) {
        var _this = _super.call(this, props) || this;
        //console.log(' here props' + JSON.stringify(props.records))
        //  this._dataList = new FakeObjectDataListStore(20, props.records);
        ; //new FakeObjectDataListStore(2000);
        var size = 10; //this._dataList.getSize();
        /*    this.state = {
              sortedDataXList: this._dataList,
              colSortDirs: {}
            };
        */
        _this._onColumnResizeEndCallback = _this._onColumnResizeEndCallback.bind(_this);
        _this._onSortChange = _this._onSortChange.bind(_this);
        _this._onColumnQBEChange = _this._onColumnQBEChange.bind(_this);
        return _this;
    }
    ;
    SortExample.prototype._onColumnResizeEndCallback = function (newColumnWidth, columnKey) {
        this.props.dispatch(fireSetColumnWidth(columnKey, newColumnWidth));
    };
    SortExample.prototype._onColumnQBEChange = function (columnKey, newQBE) {
        this.props.dispatch(fireSetQBE(columnKey, newQBE));
    };
    SortExample.prototype._onClearAllQBEs = function () {
        this.props.dispatch(fireClearAllQBEs());
    };
    SortExample.prototype._onSortChange = function (columnKey, sortDir) {
        this.props.dispatch(fireSetSort(columnKey, sortDir));
    };
    SortExample.prototype.render = function () {
        // var { /*sortedDataList, sortIndexes,  colSortDirs*/} = this.state;
        var _this = this;
        var _dataList = new FakeObjectDataListStore(this.props.records && this.props.records.length, this.props.records);
        var colSortDirs = this.props.colSortDirs;
        var size = _dataList.getSize();
        var sortIndexes = this.props.sortIndexes || [];
        var sortIndexes = sortIndexes.slice(0, 20);
        var columnsWidth = this.props.columnsWidth;
        this._onClearAllQBEs = this._onClearAllQBEs.bind(this);
        var sortedDataList = new DataListWrapper(sortIndexes, _dataList); //this._dataList),
        //console.log(' here props' + JSON.stringify(this.props))
        console.log("here is the size " + sortedDataList.getSize());
        return React.createElement(Table, __assign({ rowHeight: 40, rowsCount: sortedDataList.getSize(), headerHeight: 60, onColumnResizeEndCallback: this._onColumnResizeEndCallback, isColumnResizing: false, width: getClientRect().width - 28, height: getClientRect().height - 40 }, this.props), React.createElement(Column, { header: React.createElement(Cell, null, "link", React.createElement("br", null), React.createElement("button", { value: "avalue", title: "clear all Query fields ", className: "btnclearall", onClick: this._onClearAllQBEs }, " clear all \u25B7"), " "), cell: React.createElement(MyLinkCell, { data: sortedDataList, field: "uri", label: "AppKey" }), width: 100 }), columns.map(function (col) {
            return React.createElement(Column, { key: col, columnKey: col, width: columnsWidth[col] || 150, isResizable: true, minWidth: MINWIDTH, maxWidth: MAXWIDTH, header: React.createElement(SortHeaderCell, { onSortChange: _this._onSortChange, qbe: _this.props.columnsQBEs[col] || "", onQBEChange: _this._onColumnQBEChange, sortDir: colSortDirs[col] }, col), cell: React.createElement(TextCell, { data: sortedDataList }) });
        }));
    };
    return SortExample;
}(React.Component);
function keyToIndex(key) {
    return columns.indexOf(key);
}
function updateHash(a) {
    var hsh = "/w";
    var width = getClientRect().width;
    hsh += Object.keys(a.columnsWidth).map(function (key) {
        var i = keyToIndex(key);
        return i + "=" + (100 * a.columnsWidth[key] / width).toFixed(1);
    }).join("&");
    hsh += "/q";
    hsh += Object.keys(a.columnsQBE).map(function (key) {
        var i = keyToIndex(key);
        return i + "=" + encodeURIComponent(a.columnsQBE[key]);
    }).join("&");
    hsh += "/s" + encodeURIComponent(a.searchStr) + "/";
    window.location.hash = hsh;
    return a;
}
//==============================================
//https://gist.github.com/gaearon/074b0905337a6a835d82
var redux_thunk_1 = require("redux-thunk");
;
;
;
;
;
function getInitialState() {
    var hash = window.location.hash;
    var args = hash.split('/');
    var aState = {
        clientRect: getClientRect(),
        allLoadedRecs: [], indexList: [],
        colSortDirs: {},
        columnsQBE: {},
        sortIndexes: [],
        init: false,
        indexListQBEFiltered: [],
        indexListSearchFiltered: [],
        columnsWidth: {},
        searchStr: "7"
    };
    args.forEach(function (o) {
        if (o.charAt(0) === 'w') {
            var cols = o.substring(1).split('&');
            cols.forEach(function (col) {
                var res = col.split("=");
                try {
                    var c = columns[parseInt(res[0])];
                    if (c) {
                        var val = Math.min(MAXWIDTH, Math.max(MINWIDTH, Math.round(aState.clientRect.width * parseFloat(res[1]) / 100)));
                        if (typeof val === "number" && val !== NaN) {
                            aState.columnsWidth[c] = val;
                        }
                    }
                } catch (e) {}
            });
        }
        if (o.charAt(0) === 's') {
            aState.searchStr = decodeURIComponent(o.substring(1));
        }
        if (o.charAt(0) === 'q') {
            var cols = o.substring(1).split('&');
            cols.forEach(function (col) {
                var res = col.split("=");
                try {
                    var column = parseInt(res[0]);
                    if (typeof column === "number" && columns[column] && res[1]) {
                        aState.columnsQBE[columns[column]] = decodeURIComponent(res[1]);
                    }
                } catch (e) {}
            });
        }
    });
    return aState;
}
// ------------
// reducers
// ------------
function searchString(state, action) {
    if (state === void 0) {
        state = getInitialState();
    }
    switch (action.type) {
        case 'SetSearchString':
            //state.searchStr = action.searchStr;
            var a = Object.assign({}, state);
            var actionSetSearchString = action;
            a.searchStr = actionSetSearchString.searchStr;
            //console.log("Here select sarch state " + JSON.stringify(state));
            updateHash(a);
            return a; // action.searchStr;
        case 'ReceivePosts':
            var a = Object.assign({}, state); // copy of state!
            a.init = true;
            var actionReceivePosts = action;
            a.indexListSearchFiltered = [];
            actionReceivePosts.posts.forEach(function (p) {
                a.allLoadedRecs[p.i] = p.data;
                a.indexListSearchFiltered.push(p.i);
            });
            a.indexListSearchFiltered = actionReceivePosts.indexListSearchFiltered;
            a = applyQBE(a);
            return reSortAgain(a);
        //a[action.searchStr] = action.posts.map(p => p.data);
        // {
        //  ...state,
        //  [action.searchStr]: action.posts
        //}
        //console.log("procudes state on RECEIVE_POSTS " + JSON.stringify(a));
        case 'Resized':
            {
                var a = Object.assign({}, state);
                a.clientRect = getClientRect();
                return a;
            }
        case 'SetColumnSort':
            {
                var a = Object.assign({}, state);
                var actionSort = action;
                var a = applySort(a, actionSort.columnKey, actionSort.sortDir);
                updateHash(a);
                return a;
            }
        case 'SetColumnWidth':
            {
                var a = Object.assign({}, state);
                var actionSetWidth = action;
                a.columnsWidth = Object.assign({}, state.columnsWidth);
                a.columnsWidth[actionSetWidth.columnKey] = actionSetWidth.newColumnWidth;
                updateHash(a);
                return a;
            }
        case 'ClearAllQBEs':
            {
                var a = Object.assign({}, state);
                a.columnsQBE = {};
                updateHash(a);
                return applyQBE(a);
            }
        case 'SetColumnQBE':
            {
                var a = Object.assign({}, state);
                var actionSetColumnQBE = action;
                a.columnsQBE = Object.assign({}, state.columnsQBE);
                a.columnsQBE[actionSetColumnQBE.columnKey] = actionSetColumnQBE.newQBE;
                updateHash(a);
                return applyQBE(a);
            }
        default:
            //console.log("return default state " + JSON.stringify(a));
            return state;
    }
}
function applySort(a, columnKey, sortDir) {
    a.colSortDirs = (_a = {}, _a[columnKey] = sortDir, _a);
    reSortAgain(a);
    console.log("return default state on applySort " + JSON.stringify(a));
    return a;
    var _a;
}
function reSortAgain(a) {
    var sortIndexes = a.indexListQBEFiltered.slice(); // relevant indexes
    Object.keys(a.colSortDirs).forEach(function (columnKey) {
        var sortDir = a.colSortDirs[columnKey];
        sortIndexes.sort(function (indexA, indexB) {
            var recA = a.allLoadedRecs[indexA];
            var recB = a.allLoadedRecs[indexA];
            var valueA = a.allLoadedRecs[indexA][columnKey];
            var valueB = a.allLoadedRecs[indexB][columnKey];
            var sortVal = 0;
            if (valueA > valueB) {
                sortVal = 1;
            }
            if (valueA < valueB) {
                sortVal = -1;
            }
            if (sortVal !== 0 && sortDir === SortTypes.ASC) {
                sortVal = sortVal * -1;
            }
            return sortVal;
        });
    });
    a.sortIndexes = sortIndexes;
    return a;
}
function applyQBE(a) {
    a.indexListQBEFiltered = Object.keys(a.columnsQBE).reduce(function (prev, qbecol) {
        var val = a.columnsQBE[qbecol];
        if (!val) {
            return prev;
        }
        val = val.toLowerCase();
        return prev.filter(function (index) {
            return a.allLoadedRecs[index][qbecol] && a.allLoadedRecs[index][qbecol].toLowerCase().indexOf(val) >= 0;
        });
    }, a.indexListSearchFiltered);
    return reSortAgain(a);
}
// --------------
// action creators
// --------------
function fireSetSearchString(searchStr) {
    return {
        type: 'SetSearchString',
        searchStr: searchStr
    };
}
function fireOnResize() {
    return {
        type: 'Resized'
    };
}
function fireSetSort(columnKey, sortDir) {
    return {
        type: 'SetColumnSort',
        columnKey: columnKey,
        sortDir: sortDir
    };
}
function fireSetColumnWidth(columnKey, newColumnWidth) {
    return {
        type: 'SetColumnWidth',
        columnKey: columnKey,
        newColumnWidth: newColumnWidth
    };
}
function fireSetQBE(columnKey, newQBE) {
    return {
        type: 'SetColumnQBE',
        columnKey: columnKey,
        newQBE: newQBE
    };
}
function fireClearAllQBEs() {
    return {
        type: 'ClearAllQBEs'
    };
}
function fireReceivePosts(searchStr, dataread, indexList) {
    return {
        type: 'ReceivePosts',
        searchStr: searchStr,
        posts: dataread,
        indexListSearchFiltered: indexList
    };
}
function fetchPosts(state) {
    return function (dispatch) {
        var toIndices = fetch("" + state.searchStr).then(function (req) {
            return { json: req.json, indexList: req.indexList };
        }).then(function (res) {
            return dispatch(fireReceivePosts(state.searchStr, res.json, res.indexList));
        });
        return { thehandle: 1 };
    };
}
function fetchPostsIfNeeded(searchStr, force) {
    return function (dispatch, getState) {
        {
            if (force || !getState().searchString.init) {
                return dispatch(fetchPosts(searchStr));
            }
        }
    };
}
// ------------
// app
// ------------
function logger(a /*{ getState }*/) {
    // next => action =>
    //
    //
    var getState = a.getState;
    return function (next) {
        return function (action) {
            console.info('dispatching', action);
            var result = next(action);
            console.log('state after', getState());
            return result;
        };
    };
}
//const createStoreWithMiddleware = createStore);
var createStoreWithMiddleware = redux_1.applyMiddleware(redux_thunk_1.default, logger)(redux_1.createStore);
var reducer = redux_1.combineReducers({ searchString: searchString }); //, postsBysearchStr });
var store = createStoreWithMiddleware(reducer);
//ithMiddleware(reducer);
function fetchDataForMyApp(props, force) {
    var searchString = props.searchString;
    return fetchPostsIfNeeded(searchString, force);
}
//@provide(store)
//@connect(state => state)
var MyApp = function (_super) {
    __extends(MyApp, _super);
    function MyApp() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MyApp.prototype.componentDidMount = function () {
        var dispatch = this.props.dispatch;
        dispatch(fetchDataForMyApp(this.props));
    };
    MyApp.prototype.componentWillReceiveProps = function (nextProps) {
        var dispatch = this.props.dispatch;
        if (nextProps.searchString.searchStr !== this.props.searchString.searchStr) {
            dispatch(fetchDataForMyApp(nextProps, true));
        }
    };
    MyApp.prototype.handleChange = function (nextsearchStr) {
        this.props.dispatch(fireSetSearchString(nextsearchStr));
    };
    MyApp.prototype.render = function () {
        var that = this;
        var _a = this.props,
            searchString = _a.searchString,
            dispatch = _a.dispatch;
        var posts = searchString.allLoadedRecs || []; //searchStr[searchString];
        var sortIndexes = searchString.sortIndexes || [];
        var colSortDirs = searchString.colSortDirs || {};
        var searchStr = searchString.searchStr || "";
        //console.log(" render main component" + JSON.stringify(this.props));
        var fn = function fn() {
            dispatch(fireOnResize());
        };
        window.onresize = fn;
        return React.createElement("div", null, React.createElement(Picker, { value: searchStr, onChange: this.handleChange.bind(that) }), React.createElement(SortExample, { records: posts, columnsQBEs: this.props.searchString.columnsQBE, columnsWidth: this.props.searchString.columnsWidth, colSortDirs: colSortDirs, sortIndexes: sortIndexes, dispatch: dispatch }));
    };
    return MyApp;
}(react_1.Component);
var Picker = function (_super) {
    __extends(Picker, _super);
    function Picker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Picker.prototype.render = function () {
        var _a = this.props,
            value = _a.value,
            _onChange = _a.onChange;
        return React.createElement("header", null, "fuzzy search:", React.createElement("input", { className: "searchInput", type: "text", style: { height: "30px", width: "80%", align: "left" }, onChange: function onChange(e) {
                return _onChange(e.target.value);
            }, value: value }));
    };
    return Picker;
}(react_1.Component);
;
function pluck(o, name) {
    return o[name];
}
var Line = function (_super) {
    __extends(Line, _super);
    function Line() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Line.prototype.render = function () {
        var _this = this;
        return React.createElement("tr", { key: this.props.record.appId }, columns.map(function (col) {
            return React.createElement("td", { key: _this.props.record.appId + ' ' + col }, pluck(_this.props.record, col));
        }));
    };
    return Line;
}(react_1.Component);
/*
class Posts extends Component<IPosts, undefined> {
  render() {
    if (!this.props.posts) {
      return <p>Nothing here yet...</p>;
    } else {
      return this.renderPosts();
    }
  }

  onChangeFilter(col: string, res: string) {
    this.props.dispatch(col, res);
  }

  renderPosts() {
    var onChangeF = this.onChangeFilter as any;
    return (
      <table>
        <thead>
          <tr>
            {columns.map((col) =>
              <th key={"th" + col}>
                {columnLabels[col]}
              </th>

            )}
          </tr>
          <tr>
            {columns.map((col) =>
              <th key={col + "x"}>
                <input type="text" id="{col}" onChange={e => onChangeF(col, e.target.value)} />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {this.props.posts.map((post, i) =>
            <Line key={post.appId + '_l'} record={post} />
          )}
        </tbody>
      </table>
    );
  }
}

*/
var ReactDOM = require("react-dom");
//   <li key={i}>{post.data.title}</li>
var Post = react_redux_1.connect(mapState)(MyApp);
var MYApp = react_redux_1.connect(mapState)(MyApp);
ReactDOM.render(React.createElement(react_redux_1.Provider, { store: store }, React.createElement(MYApp, null)), document.getElementById('container'));
function mapState(state) {
    return state;
}
//function mapDispatchToProps(dispatch) {
//  return { actions: bindActionCreators(actionCreators, dispatch) };
//}
//MyApp.propTypes = {
//  counter: PropTypes.number.isRequired,
//  actions: PropTypes.object.isRequired
//};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93ZWIvcWJldGFibGUudHN4Iiwid2ViL3FiZXRhYmxlLmpzIl0sIm5hbWVzIjpbIl9fZXh0ZW5kcyIsImV4dGVuZFN0YXRpY3MiLCJPYmplY3QiLCJzZXRQcm90b3R5cGVPZiIsIl9fcHJvdG9fXyIsIkFycmF5IiwiZCIsImIiLCJwIiwiaGFzT3duUHJvcGVydHkiLCJfXyIsImNvbnN0cnVjdG9yIiwicHJvdG90eXBlIiwiY3JlYXRlIiwiX19hc3NpZ24iLCJhc3NpZ24iLCJ0IiwicyIsImkiLCJuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiY2FsbCIsIl9fcmVzdCIsImUiLCJpbmRleE9mIiwiZ2V0T3duUHJvcGVydHlTeW1ib2xzIiwicmVhY3RfMSIsInJlcXVpcmUiLCJSZWFjdCIsInJlZHV4XzEiLCJyZWFjdF9yZWR1eF8xIiwiTUFYV0lEVEgiLCJNSU5XSURUSCIsInUiLCJjb2x1bW5zIiwiY29sdW1uc1dpZHRoIiwiaWQiLCJ3aWR0aCIsImNvbHVtbkxhYmVscyIsImZvckVhY2giLCJjb2wiLCJyZWNvcmRzIiwid2luZG93IiwiYm9tZGF0YSIsInByb2R1Y2VTZWFyY2hSZXN1bHQiLCJzZWFyY2hTdHJpbmciLCJlbGFzdGljIiwiciIsInNlYXJjaCIsIm1hcCIsIm8iLCJwYXJzZUludCIsInJlZiIsImluZGV4IiwiZmV0Y2giLCJpbnB1dCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwic2V0VGltZW91dCIsImNvbnNvbGUiLCJsb2ciLCJpbmRpY2VzIiwicmVjTWFwIiwicmVzdWx0IiwicHVzaCIsImRhdGEiLCJyZXMiLCJqc29uIiwiaW5kZXhMaXN0IiwiRmFrZU9iamVjdERhdGFMaXN0U3RvcmUiLCJzaXplIiwiX2NhY2hlIiwiY3JlYXRlRmFrZVJvd09iamVjdERhdGEiLCJKU09OIiwicGFyc2UiLCJzdHJpbmdpZnkiLCJhcHBJZCIsImdldE9iamVjdEF0IiwidW5kZWZpbmVkIiwiZ2V0QWxsIiwic2xpY2UiLCJnZXRTaXplIiwiRml4ZWREYXRhVGFibGUiLCJUYWJsZSIsIkNvbHVtbiIsIkNlbGwiLCJTb3J0VHlwZXMiLCJBU0MiLCJERVNDIiwicmV2ZXJzZVNvcnREaXJlY3Rpb24iLCJzb3J0RGlyIiwiU29ydEhlYWRlckNlbGwiLCJfc3VwZXIiLCJwcm9wcyIsIl90aGlzIiwiX29uU29ydENoYW5nZSIsImJpbmQiLCJfb25RQkVDaGFuZ2UiLCJyZW5kZXIiLCJfYSIsImNoaWxkcmVuIiwicWJlIiwiY3JlYXRlRWxlbWVudCIsIm9uQ2xpY2siLCJ0eXBlIiwic3R5bGUiLCJib3JkZXJMZWZ0V2lkdGgiLCJ2YWx1ZSIsIm9uQ2hhbmdlIiwidGFyZ2V0IiwibmV3UUJFIiwib25RQkVDaGFuZ2UiLCJjb2x1bW5LZXkiLCJwcmV2ZW50RGVmYXVsdCIsIm9uU29ydENoYW5nZSIsIkNvbXBvbmVudCIsIlRleHRDZWxsIiwicm93SW5kZXgiLCJ0aXRsZSIsIkRhdGFMaXN0V3JhcHBlciIsImluZGV4TWFwIiwiX2luZGV4TWFwIiwiX2RhdGEiLCJNeUxpbmtDZWxsIiwiYXBwbHkiLCJmaWVsZCIsImxhYmVsIiwicmVjb3JkIiwiY2VsbHVybCIsImNlbGxsYWJlbCIsImhyZWYiLCJnZXRDbGllbnRSZWN0IiwidyIsImRvY3VtZW50IiwiZG9jdW1lbnRFbGVtZW50IiwiZyIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwieCIsImlubmVyV2lkdGgiLCJjbGllbnRXaWR0aCIsInkiLCJpbm5lckhlaWdodCIsImNsaWVudEhlaWdodCIsImhlaWdodCIsIlNvcnRFeGFtcGxlIiwiX29uQ29sdW1uUmVzaXplRW5kQ2FsbGJhY2siLCJfb25Db2x1bW5RQkVDaGFuZ2UiLCJuZXdDb2x1bW5XaWR0aCIsImRpc3BhdGNoIiwiZmlyZVNldENvbHVtbldpZHRoIiwiZmlyZVNldFFCRSIsIl9vbkNsZWFyQWxsUUJFcyIsImZpcmVDbGVhckFsbFFCRXMiLCJmaXJlU2V0U29ydCIsIl9kYXRhTGlzdCIsImNvbFNvcnREaXJzIiwic29ydEluZGV4ZXMiLCJzb3J0ZWREYXRhTGlzdCIsInJvd0hlaWdodCIsInJvd3NDb3VudCIsImhlYWRlckhlaWdodCIsIm9uQ29sdW1uUmVzaXplRW5kQ2FsbGJhY2siLCJpc0NvbHVtblJlc2l6aW5nIiwiaGVhZGVyIiwiY2xhc3NOYW1lIiwiY2VsbCIsImtleSIsImlzUmVzaXphYmxlIiwibWluV2lkdGgiLCJtYXhXaWR0aCIsImNvbHVtbnNRQkVzIiwia2V5VG9JbmRleCIsInVwZGF0ZUhhc2giLCJhIiwiaHNoIiwia2V5cyIsInRvRml4ZWQiLCJqb2luIiwiY29sdW1uc1FCRSIsImVuY29kZVVSSUNvbXBvbmVudCIsInNlYXJjaFN0ciIsImxvY2F0aW9uIiwiaGFzaCIsInJlZHV4X3RodW5rXzEiLCJnZXRJbml0aWFsU3RhdGUiLCJhcmdzIiwic3BsaXQiLCJhU3RhdGUiLCJjbGllbnRSZWN0IiwiYWxsTG9hZGVkUmVjcyIsImluaXQiLCJpbmRleExpc3RRQkVGaWx0ZXJlZCIsImluZGV4TGlzdFNlYXJjaEZpbHRlcmVkIiwiY2hhckF0IiwiY29scyIsInN1YnN0cmluZyIsImMiLCJ2YWwiLCJNYXRoIiwibWluIiwibWF4Iiwicm91bmQiLCJwYXJzZUZsb2F0IiwiTmFOIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiY29sdW1uIiwic3RhdGUiLCJhY3Rpb24iLCJhY3Rpb25TZXRTZWFyY2hTdHJpbmciLCJhY3Rpb25SZWNlaXZlUG9zdHMiLCJwb3N0cyIsImFwcGx5UUJFIiwicmVTb3J0QWdhaW4iLCJhY3Rpb25Tb3J0IiwiYXBwbHlTb3J0IiwiYWN0aW9uU2V0V2lkdGgiLCJhY3Rpb25TZXRDb2x1bW5RQkUiLCJzb3J0IiwiaW5kZXhBIiwiaW5kZXhCIiwicmVjQSIsInJlY0IiLCJ2YWx1ZUEiLCJ2YWx1ZUIiLCJzb3J0VmFsIiwicmVkdWNlIiwicHJldiIsInFiZWNvbCIsInRvTG93ZXJDYXNlIiwiZmlsdGVyIiwiZmlyZVNldFNlYXJjaFN0cmluZyIsImZpcmVPblJlc2l6ZSIsImZpcmVSZWNlaXZlUG9zdHMiLCJkYXRhcmVhZCIsImZldGNoUG9zdHMiLCJ0b0luZGljZXMiLCJ0aGVuIiwicmVxIiwidGhlaGFuZGxlIiwiZmV0Y2hQb3N0c0lmTmVlZGVkIiwiZm9yY2UiLCJnZXRTdGF0ZSIsImxvZ2dlciIsIm5leHQiLCJpbmZvIiwiY3JlYXRlU3RvcmVXaXRoTWlkZGxld2FyZSIsImFwcGx5TWlkZGxld2FyZSIsImRlZmF1bHQiLCJjcmVhdGVTdG9yZSIsInJlZHVjZXIiLCJjb21iaW5lUmVkdWNlcnMiLCJzdG9yZSIsImZldGNoRGF0YUZvck15QXBwIiwiTXlBcHAiLCJjb21wb25lbnREaWRNb3VudCIsImNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMiLCJuZXh0UHJvcHMiLCJoYW5kbGVDaGFuZ2UiLCJuZXh0c2VhcmNoU3RyIiwidGhhdCIsImZuIiwib25yZXNpemUiLCJQaWNrZXIiLCJhbGlnbiIsInBsdWNrIiwibmFtZSIsIkxpbmUiLCJSZWFjdERPTSIsIlBvc3QiLCJjb25uZWN0IiwibWFwU3RhdGUiLCJNWUFwcCIsIlByb3ZpZGVyIiwiZ2V0RWxlbWVudEJ5SWQiXSwibWFwcGluZ3MiOiJBQUNBO0FDQUE7O0FBQ0EsSUFBSUEsWUFBYSxhQUFRLFVBQUtBLFNBQWQsSUFBNkIsWUFBWTtBQUNyRCxRQUFJQyxnQkFBZ0JDLE9BQU9DLGNBQVAsSUFDZixFQUFFQyxXQUFXLEVBQWIsY0FBNkJDLEtBQTdCLElBQXNDLFVBQVVDLENBQVYsRUFBYUMsQ0FBYixFQUFnQjtBQUFFRCxVQUFFRixTQUFGLEdBQWNHLENBQWQ7QUFBa0IsS0FEM0QsSUFFaEIsVUFBVUQsQ0FBVixFQUFhQyxDQUFiLEVBQWdCO0FBQUUsYUFBSyxJQUFJQyxDQUFULElBQWNELENBQWQ7QUFBaUIsZ0JBQUlBLEVBQUVFLGNBQUYsQ0FBaUJELENBQWpCLENBQUosRUFBeUJGLEVBQUVFLENBQUYsSUFBT0QsRUFBRUMsQ0FBRixDQUFQO0FBQTFDO0FBQXdELEtBRjlFO0FBR0EsV0FBTyxVQUFVRixDQUFWLEVBQWFDLENBQWIsRUFBZ0I7QUFDbkJOLHNC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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE4Q0EsSUFBQXdKLFdBQUFqUCxRQUFBLFdBQUEsQ0FBQTtBQUVBO0FBR0EsSUFBSWtQLE9BQU8vTyxjQUFBZ1AsT0FBQSxDQUFRQyxRQUFSLEVBQWtCakIsS0FBbEIsQ0FBWDtBQUdBLElBQUlrQixRQUFRbFAsY0FBQWdQLE9BQUEsQ0FDVkMsUUFEVSxFQUVWakIsS0FGVSxDQUFaO0FBSUFjLFNBQVN6SyxNQUFULENBQ0V2RSxNQUFBMkUsYUFBQSxDQUFDekUsY0FBQW1QLFFBQUQsRUFBUyxFQUFDckIsT0FBT0EsS0FBUixFQUFULEVBQ0VoTyxNQUFBMkUsYUFBQSxDQUFDeUssS0FBRCxFQUFNLElBQU4sQ0FERixDQURGLEVBSUUxSSxTQUFTNEksY0FBVCxDQUF3QixXQUF4QixDQUpGO0FBT0EsU0FBQUgsUUFBQSxDQUFrQmhFLEtBQWxCLEVBQTRCO0FBQzFCLFdBQU9BLEtBQVA7QUFDRDtBQUVEO0FBQ0E7QUFDQTtBQUlBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IndlYi9xYmV0YWJsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy9pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gJ2VzNi1zaGltJztcblxuaW1wb3J0IHsgQ29tcG9uZW50LCBQcm9wVHlwZXMgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgKiBhcyBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVTdG9yZSwgY29tYmluZVJlZHVjZXJzLCBhcHBseU1pZGRsZXdhcmUsIGJpbmRBY3Rpb25DcmVhdG9ycyB9IGZyb20gJ3JlZHV4JztcbmltcG9ydCAqIGFzIFRodW5rIGZyb20gJ3JlZHV4LXRodW5rJztcbmltcG9ydCB7IFByb3ZpZGVyLCBjb25uZWN0IH0gZnJvbSAncmVhY3QtcmVkdXgnO1xuaW1wb3J0ICogYXMgcmVyZSBmcm9tICdyZWFjdC1yZWR1eCc7XG5cbmNvbnN0IE1BWFdJRFRIPSA1NzA7XG5jb25zdCBNSU5XSURUSD0gMzA7XG5cblxuaW50ZXJmYWNlIElSZWNvcmQge1xuICBcImZpb3JpIGludGVudFwiOiBzdHJpbmcsXG4gIFwiYXBwSWRcIjogc3RyaW5nLFxuICBcIkFwcE5hbWVcIjogc3RyaW5nLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IHN0cmluZ1xufTtcblxuLy90eXBlcyB1ID0ga2V5b2YgSVJlY29yZDtcbmxldCB1ID0gXCJhcHBJZFwiIGFzIGtleW9mIElSZWNvcmQ7XG4vKlxuXCJhcHBJZFwiLFxuICAgICAgICAgICAgXCJBcHBLZXlcIixcbiAgICAgICAgICAgIFwiQXBwTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIixcbiAgICAgICAgICAgICAgICBcIlJvbGVOYW1lXCIsXG4gICAgICAgICAgICAgICAgXCJBcHBsaWNhdGlvblR5cGVcIixcbiAgICAgICAgICAgICAgICBcIkJTUE5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkJTUEFwcGxpY2F0aW9uVVJMXCIsXG4gICAgICAgICAgICAgICAgXCJyZWxlYXNlTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwiQnVzaW5lc3NDYXRhbG9nXCIsXG4qL1xuY29uc3QgY29sdW1ucyA9IFtcbiAgJ2FwcElkJyxcbiAgXCJmaW9yaSBpbnRlbnRcIixcbiAgJ0FwcE5hbWUnLFxuICAnQXBwbGljYXRpb25Db21wb25lbnQnLFxuICAgICAgICAgICAgICAgIFwiQlNQTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwicmVsZWFzZU5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkJ1c2luZXNzQ2F0YWxvZ1wiLFxuLypcblwiUHJpbWFyeU9EYXRhU2VydmljZU5hbWVcIixcblwiU2VtYW50aWNBY3Rpb25cIixcblwiU2VtYW50aWNPYmplY3RcIixcblwiQXJ0aWZhY3RJZFwiLFxuXCJCdXNpbmVzc1JvbGVOYW1lXCIsXG5cIkJ1c2luZXNzR3JvdXBOYW1lXCIsXG5cIkJTUFBhY2thZ2VcIixcblwiUm9sZU5hbWVcIiwgKi9cbl0gYXMgdHlwZW9mIHVbXTtcbi8va2V5b2YgSVJlY29yZFtdO1xuXG5jb25zdCBjb2x1bW5zV2lkdGggPSBbXG4gIHsgaWQgOiAnYXBwSWQnLFxuICAgIHdpZHRoIDogNTB9ICxcbiAgXCJmaW9yaSBpbnRlbnRcIixcbiAgJ0FwcE5hbWUnLFxuICAnQXBwbGljYXRpb25Db21wb25lbnQnLFxuICAgICAgICAgICAgICAgIFwiQlNQTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwicmVsZWFzZU5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkJ1c2luZXNzQ2F0YWxvZ1wiXG5dIGFzIHR5cGVvZiB1W107XG5cblxuXG52YXIgY29sdW1uTGFiZWxzID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbmNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbiAoY29sKSB7XG4gIGNvbHVtbkxhYmVsc1tjb2xdID0gY29sO1xufSk7XG5cbnZhciByZWNvcmRzID0gW3tcbiAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgXCJhcHBJZFwiOiBcIkYxNzY2XCIsXG4gIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxufSxcbntcbiAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgXCJhcHBJZFwiOiBcIkYxN2RkZGQ2Njc3N1wiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkZGRkNmRkZGRkZGRkZGRkZGRkZGRkNlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkZDQ0NDQ0NDQ0NGRkNjZcIixcbiAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG59LFxue1xuICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICBcImFwcElkXCI6IFwiRjE3ZGRkZDY2XCIsXG4gIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxufSxcbntcbiAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgXCJhcHBJZFwiOiBcIkYxN2Q5OTk2NjQyNDM1Mzk5OWRmYXNmYXNmZGQ2NlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkMTIzNDJhYWFhMTQ0MTNkZGRkZGQ2NlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkOTk5OTk5ZGRkYmJiYmI2NlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkZDU1cndyNTU1NWRkNmFlcndlcmV3cjZcIixcbiAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG59LFxue1xuICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICBcImFwcElkXCI6IFwiRjE3ZDk5OTkxMTExMTIyMmRkMjIyMjk5ZGRkNjZcIixcbiAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG59LFxue1xuICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICBcImFwcElkXCI6IFwiRjE3ZGRkZDNzc3NzNDEyMzQyNDI2NlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkOTk5OTk5ZGRhZGZmZmZmZmZmZmZmZDY2XCIsXG4gIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxufSxcbntcbiAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgXCJhcHBJZFwiOiBcIkYxN2RkZGQ2MjQxMjQxMjZcIixcbiAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG59LFxue1xuICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICBcImFwcElkXCI6IFwiRjE3ZDk5OTk5OTMxNDIzNDMxMmRkZDY2XCIsXG4gIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxufSxcbntcbiAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgXCJhcHBJZFwiOiBcIkYxN2RkZHF3ZXF3ZXJxd2VycXdxd2Q2NlwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkcnJycndldHdlcnRkNzc3ZGQ2Nnl5eVwiLFxuICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbn0sXG57XG4gIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gIFwiYXBwSWRcIjogXCJGMTdkZDg4OHFyd3Jyd2VyOGQ2ZXdlcndlcjZcIixcbiAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG59XG5dIGFzIElSZWNvcmRbXTtcbi8qXG4gICAgICB0cyB0aW1lc3RhbXAgcHJpbWFyeSBrZXksXG4gICAgICAgICAgcmVjb3Jkbm8gaW50IG5vdCBudWxsLFxuICAgICAgICAgIGdlbmVyYXRpb25zIGludCBub3QgbnVsbCxcbiAgICAgICAgICBib3RpZCB2YXJjaGFyKDEwKSBub3QgbnVsbCxcbiAgICAgICAgICB1c2VyaWQgdmFyY2hhcig0MCkgbm90IG51bGwsXG4gICAgICAgICAgbWVzc2FnZSB2YXJjaGFyKDEwMjQpIG5vdCBudWxsLFxuICAgICAgICAgIHJlc3BvbnNlIHZhcmNoYXIoMTAyNCkgbm90IG51bGwsXG4gICAgICAgICAgYWN0aW9uIHZhcmNoYXIoNTEyKSBub3QgbnVsbCxcbiAgICAgICAgICBpbnRlbnQgdmFyY2hhcigyMCkgbm90IG51bGwsXG4gICAgICAgICAgY29udmVyc2F0aW9uaWQgdmFyY2hhcig0MCkgbm90IG51bGwsXG4gICAgICAgICAgZGVsdGEgaW50IG5vdCBudWxsLFxuICAgICAgICAgIHN0YXR1cyB2YXJjaGFyKDEwKSBub3QgbnVsbCxcbiAgICAgICAgICBtZXRhIGpzb25cbiovXG5yZWNvcmRzID0gKHdpbmRvdyBhcyBhbnkpLmJvbWRhdGEgfHwgcmVjb3JkcztcblxuZnVuY3Rpb24gcHJvZHVjZVNlYXJjaFJlc3VsdChzZWFyY2hTdHJpbmc6IHN0cmluZyk6IG51bWJlcltdIHtcblxuICB2YXIgdSA9ICh3aW5kb3cgYXMgYW55KS5lbGFzdGljO1xuICBpZihzZWFyY2hTdHJpbmcpIHtcbiAgICBpZih1KSB7XG4gICAgICB2YXIgciA9IHUuc2VhcmNoKHNlYXJjaFN0cmluZyk7XG4gICAgICByZXR1cm4gci5tYXAoZnVuY3Rpb24obyA6YW55KSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChvLnJlZik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlY29yZHMubWFwKCAocixpbmRleCkgPT4gaW5kZXggKTtcbn1cblxuLypcbnNlbGVjdCBhIGJ1bmNoIG9mIHJlcXVlc3RlZCBpbmRpY2VzLFxuKi9cbmZ1bmN0aW9uIGZldGNoKGlucHV0OiBzdHJpbmcpOiBhbnkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgY29uc29sZS5sb2coXCJzZWFyY2ggZm9yOiBcIiArIGlucHV0KTtcbiAgICAgIHZhciBpbmRpY2VzID0gcHJvZHVjZVNlYXJjaFJlc3VsdChpbnB1dCk7XG4gICAgICB2YXIgcmVjTWFwID0gW10gYXMgSVJlY29yZFtdO1xuICAgICAgdmFyIHJlc3VsdCA9IFtdIGFzIHsgaTogbnVtYmVyLCBkYXRhOiBJUmVjb3JkIH1bXTtcbiAgICAgIGluZGljZXMuZm9yRWFjaChpID0+IHtcbiAgICAgICAgaWYgKGkgPj0gMCkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHsgaTogaSwgZGF0YTogcmVjb3Jkc1tpXSB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHZhciByZXMgPSB7XG4gICAgICAgIGpzb246IHJlc3VsdCxcbiAgICAgICAgaW5kZXhMaXN0OiBpbmRpY2VzXG4gICAgICB9O1xuICAgICAgcmVzb2x2ZShyZXMpO1xuICAgIH0sIDMwMCk7XG4gIH0pXG59XG5cblxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cblxuY2xhc3MgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUge1xuICBzaXplOiBudW1iZXI7XG4gIF9jYWNoZTogSVJlY29yZFtdO1xuXG4gIGNvbnN0cnVjdG9yKC8qbnVtYmVyKi8gc2l6ZTogbnVtYmVyLCByZWNvcmRzPzogSVJlY29yZFtdKSB7XG4gICAgdGhpcy5zaXplID0gc2l6ZSB8fCAwO1xuICAgIHRoaXMuX2NhY2hlID0gcmVjb3JkcyB8fCBbXTtcbiAgICAvLyB0aGlzLl9jYWNoZSA9IFtdO1xuICB9XG5cbiAgY3JlYXRlRmFrZVJvd09iamVjdERhdGEoLypudW1iZXIqLyBpbmRleDogbnVtYmVyKTogSVJlY29yZCB7XG4gICAgdmFyIHUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlY29yZHNbaW5kZXggJSAyXSkpIGFzIElSZWNvcmQ7XG4gICAgdS5hcHBJZCA9IFwiYWFhXCIgKyBpbmRleDtcbiAgICByZXR1cm4gdTtcbiAgfVxuXG4gIGdldE9iamVjdEF0KC8qbnVtYmVyKi8gaW5kZXg6IG51bWJlcik6IElSZWNvcmQge1xuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiB0aGlzLnNpemUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9jYWNoZVtpbmRleF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY2FjaGVbaW5kZXhdID0gdGhpcy5jcmVhdGVGYWtlUm93T2JqZWN0RGF0YShpbmRleCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYWNoZVtpbmRleF07XG4gIH1cblxuICAvKipcbiAgKiBQb3B1bGF0ZXMgdGhlIGVudGlyZSBjYWNoZSB3aXRoIGRhdGEuXG4gICogVXNlIHdpdGggQ2F1dGlvbiEgQmVoYXZlcyBzbG93bHkgZm9yIGxhcmdlIHNpemVzXG4gICogZXguIDEwMCwwMDAgcm93c1xuICAqL1xuICBnZXRBbGwoKTogSVJlY29yZFtdIHtcbiAgICBpZiAodGhpcy5fY2FjaGUubGVuZ3RoIDwgdGhpcy5zaXplKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSsrKSB7XG4gICAgICAgIHRoaXMuZ2V0T2JqZWN0QXQoaSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYWNoZS5zbGljZSgpO1xuICB9XG5cbiAgZ2V0U2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnNpemU7XG4gIH1cbn1cblxuXG4vL3ZhciBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZSA9IHJlcXVpcmUoJy4vaGVscGVycy9GYWtlT2JqZWN0RGF0YUxpc3RTdG9yZScpO1xudmFyIEZpeGVkRGF0YVRhYmxlID0gcmVxdWlyZSgnZml4ZWQtZGF0YS10YWJsZScpO1xuXG5jb25zdCB7IFRhYmxlLCBDb2x1bW4sIENlbGwgfSA9IEZpeGVkRGF0YVRhYmxlO1xuXG52YXIgU29ydFR5cGVzID0ge1xuICBBU0M6ICdBU0MnLFxuICBERVNDOiAnREVTQycsXG59O1xuXG5mdW5jdGlvbiByZXZlcnNlU29ydERpcmVjdGlvbihzb3J0RGlyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHNvcnREaXIgPT09IFNvcnRUeXBlcy5ERVNDID8gU29ydFR5cGVzLkFTQyA6IFNvcnRUeXBlcy5ERVNDO1xufVxuXG5pbnRlcmZhY2UgT1NDIHtcbiAgb25Tb3J0Q2hhbmdlOiBhbnksXG4gIHFiZSA6IHN0cmluZyxcbiAgb25RQkVDaGFuZ2UoY29sdW1uS2V5IDogVFlfcmVjb3JkS2V5LCBuZXdRQkUgOiBzdHJpbmcpIDogdm9pZCxcbiAgc29ydERpcj86IGFueSxcbiAgY29sdW1uS2V5PzogYW55XG59XG5cbmNsYXNzIFNvcnRIZWFkZXJDZWxsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50PE9TQywgYW55PiB7XG4gIC8vb25Tb3J0Q2hhbmdlPyA6IGFueTtcbiAgLy9zb3J0RGlyIDogYW55O1xuICAvL2NvbHVtbktleSA6IGFueTtcblxuICBjb25zdHJ1Y3Rvcihwcm9wczogT1NDKSB7XG4gICAgc3VwZXIocHJvcHMpO1xuICAgIHRoaXMuX29uU29ydENoYW5nZSA9IHRoaXMuX29uU29ydENoYW5nZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX29uUUJFQ2hhbmdlID0gdGhpcy5fb25RQkVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgfVxuXG5cblxuICByZW5kZXIoKSB7XG4gICAgdmFyIHsgc29ydERpciwgY2hpbGRyZW4sIHFiZSwgIC4uLnByb3BzIH0gPSB0aGlzLnByb3BzO1xuICAgIC8vIHsuLi5wcm9wc30+XG4gICAgcmV0dXJuIChcbiAgICAgIDxDZWxsPlxuICAgICAgICA8YSBvbkNsaWNrPXt0aGlzLl9vblNvcnRDaGFuZ2V9PlxuICAgICAgICAgIHtjaGlsZHJlbn0ge3NvcnREaXIgPyAoc29ydERpciA9PT0gU29ydFR5cGVzLkRFU0MgPyAnJiM5NjYwO+KGkycgOiAnJiM5NjUwO+KGkScpIDogJyd9XG4gICAgICAgIDwvYT5cbiAgICAgICAgPGJyLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgc3R5bGU9e3t3aWR0aDpcIjEwMCVcIiwgYm9yZGVyTGVmdFdpZHRoIDogXCIwcHhcIn19ICB2YWx1ZT17cWJlfSAgIG9uQ2hhbmdlPXtlID0+IHRoaXMuX29uUUJFQ2hhbmdlKGUudGFyZ2V0LnZhbHVlKX0+PC9pbnB1dD5cbiAgICAgIDwvQ2VsbD5cbiAgICApO1xuICB9XG5cbiAgX29uUUJFQ2hhbmdlKG5ld1FCRTogc3RyaW5nKSB7XG4gICAgaWYodGhpcy5wcm9wcy5vblFCRUNoYW5nZSkge1xuICAgICB0aGlzLnByb3BzLm9uUUJFQ2hhbmdlKFxuICAgICAgdGhpcy5wcm9wcy5jb2x1bW5LZXksXG4gICAgICAgbmV3UUJFXG4gICAgICk7XG4gICAgfVxuICB9XG5cbiAgX29uU29ydENoYW5nZShlOiBhbnkpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBpZiAodGhpcy5wcm9wcy5vblNvcnRDaGFuZ2UpIHtcbiAgICAgIHRoaXMucHJvcHMub25Tb3J0Q2hhbmdlKFxuICAgICAgICB0aGlzLnByb3BzLmNvbHVtbktleSxcbiAgICAgICAgdGhpcy5wcm9wcy5zb3J0RGlyID9cbiAgICAgICAgICByZXZlcnNlU29ydERpcmVjdGlvbih0aGlzLnByb3BzLnNvcnREaXIpIDpcbiAgICAgICAgICBTb3J0VHlwZXMuREVTQ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgVGV4dENlbGwgPSAoeyByb3dJbmRleCwgZGF0YSwgY29sdW1uS2V5LCAuLi5wcm9wcyB9OiBhbnkpID0+IChcbiAgPENlbGwgdGl0bGU9e2RhdGEuZ2V0T2JqZWN0QXQocm93SW5kZXgpW2NvbHVtbktleV19ICB7Li4ucHJvcHN9PlxuICA8ZGl2IHRpdGxlPXtkYXRhLmdldE9iamVjdEF0KHJvd0luZGV4KVtjb2x1bW5LZXldfT5cbiAgIHtkYXRhLmdldE9iamVjdEF0KHJvd0luZGV4KVtjb2x1bW5LZXldfSA8L2Rpdj5cbiAgPC9DZWxsPlxuKTtcblxuY2xhc3MgRGF0YUxpc3RXcmFwcGVyIHtcbiAgX2luZGV4TWFwOiBudW1iZXJbXTtcbiAgX2RhdGE6IGFueTtcbiAgY29uc3RydWN0b3IoaW5kZXhNYXA6IG51bWJlcltdLCBkYXRhOiBhbnkpIHtcbiAgICB0aGlzLl9pbmRleE1hcCA9IGluZGV4TWFwIHx8IFtdO1xuICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB9XG5cbiAgZ2V0U2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5kZXhNYXAubGVuZ3RoO1xuICB9XG5cbiAgZ2V0T2JqZWN0QXQoaW5kZXg6IG51bWJlcik6IElSZWNvcmQge1xuICAgIHJldHVybiB0aGlzLl9kYXRhLmdldE9iamVjdEF0KFxuICAgICAgdGhpcy5faW5kZXhNYXBbaW5kZXhdLFxuICAgICk7XG4gIH1cbn1cblxuXG5jbGFzcyBNeUxpbmtDZWxsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50PGFueSxhbnk+IHtcbiAgcmVuZGVyKCkge1xuICAgIGNvbnN0IHtyb3dJbmRleCwgZmllbGQsIGRhdGEsIGxhYmVsLCAuLi5wcm9wc30gPSB0aGlzLnByb3BzO1xuICAgIGNvbnN0IHJlY29yZCA9IGRhdGEuZ2V0T2JqZWN0QXQoICByb3dJbmRleCk7XG4gICAgY29uc3QgY2VsbHVybCA9IHJlY29yZFtmaWVsZF07XG4gICAgY29uc3QgY2VsbGxhYmVsID0gcmVjb3JkW2xhYmVsXTtcbiAgICByZXR1cm4gKFxuICAgICAgPENlbGwgey4uLnByb3BzfT5cbiAgICAgICAgPGEgaHJlZj17Y2VsbHVybH0gdGFyZ2V0PVwiX2JsYW5rXCI+IEEge2NlbGxsYWJlbH08L2E+XG4gICAgICA8L0NlbGw+XG4gICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0KCkge1xudmFyIHcgPSB3aW5kb3csXG4gICAgZCA9IGRvY3VtZW50LFxuICAgIGUgPSBkLmRvY3VtZW50RWxlbWVudCxcbiAgICBnID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYm9keScpWzBdLFxuICAgIHggPSB3LmlubmVyV2lkdGggfHwgZS5jbGllbnRXaWR0aCB8fCBnLmNsaWVudFdpZHRoLFxuICAgIHkgPSB3LmlubmVySGVpZ2h0fHwgZS5jbGllbnRIZWlnaHR8fCBnLmNsaWVudEhlaWdodDtcbiAgICByZXR1cm4geyBoZWlnaHQgOiB5LCB3aWR0aDogeH1cbn1cblxuaW50ZXJmYWNlIElQcm9wc1NvcnRFeGFtcGxlIHtcbiAgZGlzcGF0Y2g6IGFueSxcbiAgcmVjb3JkczogSVJlY29yZFtdLFxuICBjb2x1bW5zV2lkdGggOiBJQ29sdW1uc1dpZHRoLFxuICBjb2xTb3J0RGlyczogSUNvbFNvcnREaXJzLFxuICBjb2x1bW5zUUJFcyA6IElDb2x1bW5zUUJFLFxuICBzb3J0SW5kZXhlczogbnVtYmVyW11cbn1cblxuaW50ZXJmYWNlIElTb3J0U3RhdGUge1xuXG59O1xuXG5jbGFzcyBTb3J0RXhhbXBsZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudDxJUHJvcHNTb3J0RXhhbXBsZSwgSVNvcnRTdGF0ZT4ge1xuLy8gIF9kYXRhTGlzdDogYW55O1xuLy8gIHN0YXRlOiBhbnk7XG4gIGNvbnN0cnVjdG9yKHByb3BzOiBJUHJvcHNTb3J0RXhhbXBsZSkge1xuICAgIHN1cGVyKHByb3BzKTtcbiAgICAvL2NvbnNvbGUubG9nKCcgaGVyZSBwcm9wcycgKyBKU09OLnN0cmluZ2lmeShwcm9wcy5yZWNvcmRzKSlcbiAgLy8gIHRoaXMuX2RhdGFMaXN0ID0gbmV3IEZha2VPYmplY3REYXRhTGlzdFN0b3JlKDIwLCBwcm9wcy5yZWNvcmRzKTtcbiAgICA7Ly9uZXcgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUoMjAwMCk7XG5cbiAgICB2YXIgc2l6ZSA9IDEwOyAvL3RoaXMuX2RhdGFMaXN0LmdldFNpemUoKTtcbi8qICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBzb3J0ZWREYXRhWExpc3Q6IHRoaXMuX2RhdGFMaXN0LFxuICAgICAgY29sU29ydERpcnM6IHt9XG4gICAgfTtcbiovXG4gICAgdGhpcy5fb25Db2x1bW5SZXNpemVFbmRDYWxsYmFjayA9IHRoaXMuX29uQ29sdW1uUmVzaXplRW5kQ2FsbGJhY2suYmluZCh0aGlzKTtcbiAgICB0aGlzLl9vblNvcnRDaGFuZ2UgPSB0aGlzLl9vblNvcnRDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9vbkNvbHVtblFCRUNoYW5nZSA9IHRoaXMuX29uQ29sdW1uUUJFQ2hhbmdlLmJpbmQodGhpcyk7XG4gIH07XG5cbiAgX29uQ29sdW1uUmVzaXplRW5kQ2FsbGJhY2sobmV3Q29sdW1uV2lkdGggOiBudW1iZXIsIGNvbHVtbktleSA6IFRZX3JlY29yZEtleSkge1xuICAgIHRoaXMucHJvcHMuZGlzcGF0Y2goZmlyZVNldENvbHVtbldpZHRoKGNvbHVtbktleSwgbmV3Q29sdW1uV2lkdGgpKTtcbiAgfVxuXG4gIF9vbkNvbHVtblFCRUNoYW5nZShjb2x1bW5LZXk6IFRZX3JlY29yZEtleSwgbmV3UUJFOiBzdHJpbmcpIHtcbiAgICB0aGlzLnByb3BzLmRpc3BhdGNoKGZpcmVTZXRRQkUoY29sdW1uS2V5LCBuZXdRQkUpKTtcbiAgfVxuICBfb25DbGVhckFsbFFCRXMoKSB7XG4gICAgdGhpcy5wcm9wcy5kaXNwYXRjaChmaXJlQ2xlYXJBbGxRQkVzKCkpO1xuICB9XG5cbiAgX29uU29ydENoYW5nZShjb2x1bW5LZXk6IFRZX3JlY29yZEtleSwgc29ydERpcjogc3RyaW5nKSB7XG4gICAgdGhpcy5wcm9wcy5kaXNwYXRjaChmaXJlU2V0U29ydChjb2x1bW5LZXksIHNvcnREaXIpKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICAvLyB2YXIgeyAvKnNvcnRlZERhdGFMaXN0LCBzb3J0SW5kZXhlcywgIGNvbFNvcnREaXJzKi99ID0gdGhpcy5zdGF0ZTtcblxuICAgIHZhciBfZGF0YUxpc3QgPSBuZXcgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUodGhpcy5wcm9wcy5yZWNvcmRzICYmIHRoaXMucHJvcHMucmVjb3Jkcy5sZW5ndGgsIHRoaXMucHJvcHMucmVjb3JkcylcbiAgICB2YXIgY29sU29ydERpcnMgPSB0aGlzLnByb3BzLmNvbFNvcnREaXJzO1xuICAgIHZhciBzaXplID0gX2RhdGFMaXN0LmdldFNpemUoKTtcbiAgICB2YXIgc29ydEluZGV4ZXMgPSB0aGlzLnByb3BzLnNvcnRJbmRleGVzIHx8IFtdO1xuICAgIHZhciBzb3J0SW5kZXhlcyA9IHNvcnRJbmRleGVzLnNsaWNlKDAsMjApO1xuICAgIHZhciBjb2x1bW5zV2lkdGggPSB0aGlzLnByb3BzLmNvbHVtbnNXaWR0aDtcbiAgICB0aGlzLl9vbkNsZWFyQWxsUUJFcyA9IHRoaXMuX29uQ2xlYXJBbGxRQkVzLmJpbmQodGhpcyk7XG4gICAgdmFyIHNvcnRlZERhdGFMaXN0ID0gbmV3IERhdGFMaXN0V3JhcHBlcihzb3J0SW5kZXhlcywgX2RhdGFMaXN0KTsgLy90aGlzLl9kYXRhTGlzdCksXG4gICAgLy9jb25zb2xlLmxvZygnIGhlcmUgcHJvcHMnICsgSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9wcykpXG4gICAgY29uc29sZS5sb2coXCJoZXJlIGlzIHRoZSBzaXplIFwiICsgc29ydGVkRGF0YUxpc3QuZ2V0U2l6ZSgpKTtcbiAgICByZXR1cm4gKFxuICAgICAgPFRhYmxlXG4gICAgICAgIHJvd0hlaWdodD17NDB9XG4gICAgICAgIHJvd3NDb3VudD17c29ydGVkRGF0YUxpc3QuZ2V0U2l6ZSgpfVxuICAgICAgICBoZWFkZXJIZWlnaHQ9ezYwfVxuICAgICAgICBvbkNvbHVtblJlc2l6ZUVuZENhbGxiYWNrPXt0aGlzLl9vbkNvbHVtblJlc2l6ZUVuZENhbGxiYWNrfVxuICAgICAgICBpc0NvbHVtblJlc2l6aW5nPXtmYWxzZX1cbiAgICAgICAgd2lkdGg9e2dldENsaWVudFJlY3QoKS53aWR0aCAtIDI4fVxuICAgICAgICBoZWlnaHQ9e2dldENsaWVudFJlY3QoKS5oZWlnaHQgLSA0MH1cbiAgICAgICAgey4uLnRoaXMucHJvcHN9PlxuICAgICAgICA8Q29sdW1uXG4gICAgICAgICAgaGVhZGVyPXs8Q2VsbD5saW5rPGJyLz48YnV0dG9uIHZhbHVlPVwiYXZhbHVlXCIgIHRpdGxlPVwiY2xlYXIgYWxsIFF1ZXJ5IGZpZWxkcyBcIiBjbGFzc05hbWU9XCJidG5jbGVhcmFsbFwiIG9uQ2xpY2s9e3RoaXMuX29uQ2xlYXJBbGxRQkVzfT4gY2xlYXIgYWxsICYjOTY1NTs8L2J1dHRvbj4gPC9DZWxsPn1cbiAgICAgICAgICBjZWxsPXtcbiAgICAgICAgICAgIDxNeUxpbmtDZWxsXG4gICAgICAgICAgICAgIGRhdGE9e3NvcnRlZERhdGFMaXN0fVxuICAgICAgICAgICAgICBmaWVsZD1cInVyaVwiXG4gICAgICAgICAgICAgIGxhYmVsPVwiQXBwS2V5XCJcbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgfVxuICAgICAgICAgIHdpZHRoPXsxMDB9XG4gICAgICAgIC8+XG4gICAgICAgIHtjb2x1bW5zLm1hcCgoY29sKSA9PlxuICAgICAgICAgIDxDb2x1bW4ga2V5PXtjb2x9XG4gICAgICAgICAgICBjb2x1bW5LZXk9e2NvbH1cblxuICAgICAgICAgIHdpZHRoPXtjb2x1bW5zV2lkdGhbY29sXSB8fCAxNTB9XG4gICAgICAgICAgaXNSZXNpemFibGU9e3RydWV9XG4gICAgICAgICAgbWluV2lkdGg9e01JTldJRFRIfVxuICAgICAgICAgIG1heFdpZHRoPXtNQVhXSURUSH1cblxuICAgICAgICAgICAgaGVhZGVyPXtcbiAgICAgICAgICAgICAgPFNvcnRIZWFkZXJDZWxsXG4gICAgICAgICAgICAgICAgb25Tb3J0Q2hhbmdlPXt0aGlzLl9vblNvcnRDaGFuZ2V9XG4gICAgICAgICAgICAgICAgcWJlPXt0aGlzLnByb3BzLmNvbHVtbnNRQkVzW2NvbF0gfHwgXCJcIn1cbiAgICAgICAgICAgICAgICBvblFCRUNoYW5nZT17dGhpcy5fb25Db2x1bW5RQkVDaGFuZ2V9XG4gICAgICAgICAgICAgICAgc29ydERpcj17Y29sU29ydERpcnNbY29sXX0+XG4gICAgICAgICAgICAgICAge2NvbH1cbiAgICAgICAgICAgICAgPC9Tb3J0SGVhZGVyQ2VsbD5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNlbGw9ezxUZXh0Q2VsbCBkYXRhPXtzb3J0ZWREYXRhTGlzdH0gLz59XG4gICAgICAgICAgLz5cbiAgICAgICAgKX1cblxuICAgICAgPC9UYWJsZT5cbiAgICApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGtleVRvSW5kZXgoa2V5IDogc3RyaW5nKSB7XG4gIHJldHVybiAoY29sdW1ucyBhcyBhbnkpLmluZGV4T2Yoa2V5KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSGFzaChhIDogSVN0YXRlKSB7XG4gIHZhciBoc2ggPSBcIi93XCI7XG4gIHZhciB3aWR0aCA9IGdldENsaWVudFJlY3QoKS53aWR0aDtcbiAgaHNoICs9IE9iamVjdC5rZXlzKGEuY29sdW1uc1dpZHRoKS5tYXAoa2V5ID0+e1xuICAgIHZhciBpID0ga2V5VG9JbmRleChrZXkpO1xuICAgIHJldHVybiAgYCR7aX09JHsoMTAwKmEuY29sdW1uc1dpZHRoW2tleV0vd2lkdGgpLnRvRml4ZWQoMSl9YDtcbiAgfSkuam9pbihcIiZcIik7XG4gIGhzaCArPSBcIi9xXCI7XG4gIGhzaCArPSBPYmplY3Qua2V5cyhhLmNvbHVtbnNRQkUpLm1hcChrZXkgPT57XG4gICAgdmFyIGkgPSBrZXlUb0luZGV4KGtleSk7XG4gICAgcmV0dXJuICBgJHtpfT0ke2VuY29kZVVSSUNvbXBvbmVudChhLmNvbHVtbnNRQkVba2V5XSl9YDtcbiAgfSkuam9pbihcIiZcIik7XG5cbiAgaHNoICs9IGAvcyR7ZW5jb2RlVVJJQ29tcG9uZW50KGEuc2VhcmNoU3RyKX0vYDtcbiAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoc2g7XG4gIHJldHVybiBhO1xufVxuXG5cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cblxuXG4vL2h0dHBzOi8vZ2lzdC5naXRodWIuY29tL2dhZWFyb24vMDc0YjA5MDUzMzdhNmE4MzVkODJcblxuaW1wb3J0IHRodW5rIGZyb20gJ3JlZHV4LXRodW5rJztcblxuXG5pbnRlcmZhY2UgSUFjdGlvbiB7XG4gIHR5cGU6IHN0cmluZ1xufTtcblxuXG5pbnRlcmZhY2UgSUFjdGlvblNldFNlYXJjaCBleHRlbmRzIElBY3Rpb24ge1xuICAvL3Bvc3RzPzogeyBpOiBudW1iZXIsIGRhdGE6IElSZWNvcmQgfVtdLFxuICBzZWFyY2hTdHI/OiBhbnlcbn1cblxuaW50ZXJmYWNlIElBY3Rpb25SZWNlaXZlUG9zdHMgZXh0ZW5kcyBJQWN0aW9uIHtcbiAgcG9zdHM6IHsgaTogbnVtYmVyLCBkYXRhOiBJUmVjb3JkIH1bXSxcbiAgc2VhcmNoU3RyOiBzdHJpbmcsXG4gIGluZGV4TGlzdFNlYXJjaEZpbHRlcmVkPzogbnVtYmVyW10gLy9pbmRleGxpc3QgcmVsZXZhbnQgZm9yIHNlYXJjaFxufVxuXG5pbnRlcmZhY2UgSUFjdGlvblNldENvbHVtblNvcnQgZXh0ZW5kcyBJQWN0aW9uIHtcbiAgdHlwZTogc3RyaW5nLFxuICBjb2x1bW5LZXk6IFRZX3JlY29yZEtleSxcbiAgc29ydERpcjogc3RyaW5nXG59O1xuXG5pbnRlcmZhY2UgSUFjdGlvblNldENvbHVtbldpZHRoIGV4dGVuZHMgSUFjdGlvbiB7XG4gIHR5cGU6IHN0cmluZyxcbiAgY29sdW1uS2V5OiBUWV9yZWNvcmRLZXksXG4gIG5ld0NvbHVtbldpZHRoIDogbnVtYmVyXG59O1xuXG5pbnRlcmZhY2UgSUFjdGlvblNldENvbHVtblFCRSBleHRlbmRzIElBY3Rpb24ge1xuICB0eXBlOiBzdHJpbmcsXG4gIGNvbHVtbktleTogVFlfcmVjb3JkS2V5LFxuICBuZXdRQkUgOiBzdHJpbmdcbn07XG5pbnRlcmZhY2UgSUFjdGlvbkNsZWFyQWxsUUJFcyBleHRlbmRzIElBY3Rpb24ge1xuICB0eXBlOiBzdHJpbmdcbn07XG5cblxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkgOiBJU3RhdGUge1xuICB2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICB2YXIgYXJncyA9IGhhc2guc3BsaXQoJy8nKTtcbiAgdmFyIGFTdGF0ZSA9IHtcbiAgICBjbGllbnRSZWN0OiBnZXRDbGllbnRSZWN0KCksXG4gICAgYWxsTG9hZGVkUmVjczogW10sIGluZGV4TGlzdDogW10sXG4gICAgY29sU29ydERpcnM6IHt9LFxuICAgIGNvbHVtbnNRQkUgOnt9LFxuICAgIHNvcnRJbmRleGVzOiBbXSxcbiAgICBpbml0IDogZmFsc2UsXG4gICAgaW5kZXhMaXN0UUJFRmlsdGVyZWQgOiBbXSxcbiAgICBpbmRleExpc3RTZWFyY2hGaWx0ZXJlZDogW10sXG4gICAgY29sdW1uc1dpZHRoOiB7fSxcbiAgICBzZWFyY2hTdHI6IFwiN1wiXG4gIH0gYXMgSVN0YXRlO1xuICBhcmdzLmZvckVhY2goZnVuY3Rpb24obykge1xuICAgIGlmKG8uY2hhckF0KDApID09PSAndycpIHtcbiAgICAgIHZhciBjb2xzID0gby5zdWJzdHJpbmcoMSkuc3BsaXQoJyYnKTtcbiAgICAgIGNvbHMuZm9yRWFjaChjb2wgPT4ge1xuICAgICAgICB2YXIgcmVzID0gY29sLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgYyA9IGNvbHVtbnNbcGFyc2VJbnQocmVzWzBdKV07XG4gICAgICAgICAgaWYoYykge1xuICAgICAgICAgICAgdmFyIHZhbCA9IE1hdGgubWluKE1BWFdJRFRILCBNYXRoLm1heChNSU5XSURUSCwgTWF0aC5yb3VuZChhU3RhdGUuY2xpZW50UmVjdC53aWR0aCAqIHBhcnNlRmxvYXQocmVzWzFdKSAvIDEwMCkpKTtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIgJiYgdmFsICE9PSBOYU4pIHtcbiAgICAgICAgICAgICAgYVN0YXRlLmNvbHVtbnNXaWR0aFtjXSA9IHZhbFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCggZSkge1xuXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZihvLmNoYXJBdCgwKSA9PT0gJ3MnKSB7XG4gICAgICBhU3RhdGUuc2VhcmNoU3RyID0gZGVjb2RlVVJJQ29tcG9uZW50KG8uc3Vic3RyaW5nKDEpKTtcbiAgICB9XG4gICAgaWYoby5jaGFyQXQoMCkgPT09ICdxJykge1xuICAgICAgdmFyIGNvbHMgPSBvLnN1YnN0cmluZygxKS5zcGxpdCgnJicpO1xuICAgICAgY29scy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgIHZhciByZXMgPSBjb2wuc3BsaXQoXCI9XCIpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhciBjb2x1bW4gPSBwYXJzZUludChyZXNbMF0pO1xuICAgICAgICAgIGlmKHR5cGVvZiBjb2x1bW4gPT09IFwibnVtYmVyXCIgJiYgY29sdW1uc1tjb2x1bW5dICYmIHJlc1sxXSkge1xuICAgICAgICAgICAgYVN0YXRlLmNvbHVtbnNRQkVbY29sdW1uc1tjb2x1bW5dXSA9IGRlY29kZVVSSUNvbXBvbmVudChyZXNbMV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCggZSkge1xuXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICApO1xuICByZXR1cm4gYVN0YXRlO1xufVxuXG4vLyAtLS0tLS0tLS0tLS1cbi8vIHJlZHVjZXJzXG4vLyAtLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gc2VhcmNoU3RyaW5nKHN0YXRlID0gZ2V0SW5pdGlhbFN0YXRlKClcbiAgLCBhY3Rpb246IElBY3Rpb24pIHtcbiAgc3dpdGNoIChhY3Rpb24udHlwZSkge1xuICAgIGNhc2UgJ1NldFNlYXJjaFN0cmluZyc6XG4gICAgICAvL3N0YXRlLnNlYXJjaFN0ciA9IGFjdGlvbi5zZWFyY2hTdHI7XG4gICAgICB2YXIgYSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlKSBhcyBJU3RhdGU7XG4gICAgICB2YXIgYWN0aW9uU2V0U2VhcmNoU3RyaW5nID0gYWN0aW9uIGFzIElBY3Rpb25TZXRTZWFyY2g7XG4gICAgICBhLnNlYXJjaFN0ciA9IGFjdGlvblNldFNlYXJjaFN0cmluZy5zZWFyY2hTdHI7XG4gICAgICAvL2NvbnNvbGUubG9nKFwiSGVyZSBzZWxlY3Qgc2FyY2ggc3RhdGUgXCIgKyBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgICAgdXBkYXRlSGFzaChhKTtcbiAgICAgIHJldHVybiBhOyAvLyBhY3Rpb24uc2VhcmNoU3RyO1xuICBjYXNlICdSZWNlaXZlUG9zdHMnOlxuICAgICAgdmFyIGEgPSAoT2JqZWN0IGFzIGFueSkuYXNzaWduKHt9LCBzdGF0ZSkgYXMgSVN0YXRlOyAvLyBjb3B5IG9mIHN0YXRlIVxuICAgICAgYS5pbml0ID0gdHJ1ZTtcbiAgICAgIHZhciBhY3Rpb25SZWNlaXZlUG9zdHMgPSBhY3Rpb24gYXMgSUFjdGlvblJlY2VpdmVQb3N0cztcbiAgICAgIGEuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQgPSBbXTtcbiAgICAgIGFjdGlvblJlY2VpdmVQb3N0cy5wb3N0cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgICBhLmFsbExvYWRlZFJlY3NbcC5pXSA9IHAuZGF0YTtcbiAgICAgICAgYS5pbmRleExpc3RTZWFyY2hGaWx0ZXJlZC5wdXNoKHAuaSk7XG4gICAgICB9KTtcbiAgICAgIGEuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQgPSBhY3Rpb25SZWNlaXZlUG9zdHMuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQ7XG4gICAgICBhID0gYXBwbHlRQkUoYSk7XG4gICAgICByZXR1cm4gcmVTb3J0QWdhaW4oYSk7XG4gICAgICAvL2FbYWN0aW9uLnNlYXJjaFN0cl0gPSBhY3Rpb24ucG9zdHMubWFwKHAgPT4gcC5kYXRhKTtcbiAgICAgIC8vIHtcbiAgICAgIC8vICAuLi5zdGF0ZSxcbiAgICAgIC8vICBbYWN0aW9uLnNlYXJjaFN0cl06IGFjdGlvbi5wb3N0c1xuICAgICAgLy99XG4gICAgICAvL2NvbnNvbGUubG9nKFwicHJvY3VkZXMgc3RhdGUgb24gUkVDRUlWRV9QT1NUUyBcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgICBjYXNlICdSZXNpemVkJzoge1xuICAgICAgdmFyIGEgPSAoT2JqZWN0IGFzIGFueSkuYXNzaWduKHt9LCBzdGF0ZSkgYXMgSVN0YXRlO1xuICAgICAgYS5jbGllbnRSZWN0ID0gZ2V0Q2xpZW50UmVjdCgpO1xuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICAgIGNhc2UgJ1NldENvbHVtblNvcnQnOiB7XG4gICAgICB2YXIgYSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlKSBhcyBJU3RhdGU7XG4gICAgICB2YXIgYWN0aW9uU29ydCA9IGFjdGlvbiBhcyBJQWN0aW9uU2V0Q29sdW1uU29ydDtcblxuICAgICAgdmFyIGEgPSBhcHBseVNvcnQoYSwgYWN0aW9uU29ydC5jb2x1bW5LZXksIGFjdGlvblNvcnQuc29ydERpcik7XG4gICAgICB1cGRhdGVIYXNoKGEpO1xuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICAgIGNhc2UgJ1NldENvbHVtbldpZHRoJzoge1xuICAgICAgdmFyIGEgPSAoT2JqZWN0IGFzIGFueSkuYXNzaWduKHt9LCBzdGF0ZSkgYXMgSVN0YXRlO1xuICAgICAgdmFyIGFjdGlvblNldFdpZHRoID0gYWN0aW9uIGFzIElBY3Rpb25TZXRDb2x1bW5XaWR0aDtcbiAgICAgIGEuY29sdW1uc1dpZHRoID0gKE9iamVjdCBhcyBhbnkpLmFzc2lnbih7fSwgc3RhdGUuY29sdW1uc1dpZHRoKTtcbiAgICAgIGEuY29sdW1uc1dpZHRoW2FjdGlvblNldFdpZHRoLmNvbHVtbktleV0gPSBhY3Rpb25TZXRXaWR0aC5uZXdDb2x1bW5XaWR0aDtcbiAgICAgIHVwZGF0ZUhhc2goYSlcbiAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgICBjYXNlICdDbGVhckFsbFFCRXMnIDoge1xuICAgICAgdmFyIGEgPSAoT2JqZWN0IGFzIGFueSkuYXNzaWduKHt9LCBzdGF0ZSkgYXMgSVN0YXRlO1xuICAgICAgYS5jb2x1bW5zUUJFID0ge307XG4gICAgICB1cGRhdGVIYXNoKGEpO1xuICAgICAgcmV0dXJuIGFwcGx5UUJFKGEpO1xuICAgIH1cbiAgICBjYXNlICdTZXRDb2x1bW5RQkUnOiB7XG4gICAgICB2YXIgYSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlKSBhcyBJU3RhdGU7XG4gICAgICB2YXIgYWN0aW9uU2V0Q29sdW1uUUJFID0gYWN0aW9uIGFzIElBY3Rpb25TZXRDb2x1bW5RQkU7XG4gICAgICBhLmNvbHVtbnNRQkUgPSAoT2JqZWN0IGFzIGFueSkuYXNzaWduKHt9LCBzdGF0ZS5jb2x1bW5zUUJFKTtcbiAgICAgIGEuY29sdW1uc1FCRVthY3Rpb25TZXRDb2x1bW5RQkUuY29sdW1uS2V5XSA9IGFjdGlvblNldENvbHVtblFCRS5uZXdRQkU7XG4gICAgICB1cGRhdGVIYXNoKGEpO1xuICAgICAgcmV0dXJuIGFwcGx5UUJFKGEpO1xuICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgLy9jb25zb2xlLmxvZyhcInJldHVybiBkZWZhdWx0IHN0YXRlIFwiICsgSlNPTi5zdHJpbmdpZnkoYSkpO1xuICAgICAgcmV0dXJuIHN0YXRlO1xuICB9XG59XG5cbnR5cGUgSUNvbFNvcnREaXJzID0geyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuXG50eXBlIElDb2x1bW5zV2lkdGggPSB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9XG5cbnR5cGUgSUNvbHVtbnNRQkUgPSB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9XG4vLyBUT0RVIExVTlIuanNcblxuaW50ZXJmYWNlIElTdGF0ZSB7XG4gIGNsaWVudFJlY3QgOiAgeyB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcn0sXG4gIHNlYXJjaFN0cjogc3RyaW5nLFxuICBhbGxMb2FkZWRSZWNzOiBJUmVjb3JkW10sIC8vIGEgc3BhcnNlIGFycmF5IG9mIHJlY29yZHMgaW5kZXggc3RhYmxlIVxuICBpbmRleExpc3RTZWFyY2hGaWx0ZXJlZDogbnVtYmVyW10gLy8gYSBsaXN0IG9mIFNlYXJjaCBmaWx0ZXJlZCBpbmRpY2VzXG4gIGluaXQ6IGJvb2xlYW4sXG5cbiAgLy9jb2x1bW5XaWR0aHNcbiAgY29sdW1uc1dpZHRoIDogSUNvbHVtbnNXaWR0aCxcblxuICAgLy9jb2x1bW5XaWR0aHNcbiAgY29sdW1uc1FCRSA6IElDb2x1bW5zUUJFLFxuICBpbmRleExpc3RRQkVGaWx0ZXJlZCA6IG51bWJlcltdLFxuXG4gIC8vIHNvcnQgc3RhdGVcbiAgc29ydEluZGV4ZXM6IG51bWJlcltdXG4gIGNvbFNvcnREaXJzOiBJQ29sU29ydERpcnNcbiAgLy8gICAgICBbY29sdW1uS2V5XTogc3RyaW5nLFxuICAvLyAgICB9LFxufVxuXG50eXBlIFRZX3JlY29yZEtleSA9IGtleW9mIElSZWNvcmQ7XG5cbmZ1bmN0aW9uIGFwcGx5U29ydChhOiBJU3RhdGUsIGNvbHVtbktleTogVFlfcmVjb3JkS2V5LCBzb3J0RGlyOiBzdHJpbmcpOiBJU3RhdGUge1xuICBhLmNvbFNvcnREaXJzID0geyBbY29sdW1uS2V5XTogc29ydERpciB9O1xuICByZVNvcnRBZ2FpbihhKTtcbiAgY29uc29sZS5sb2coXCJyZXR1cm4gZGVmYXVsdCBzdGF0ZSBvbiBhcHBseVNvcnQgXCIgKyBKU09OLnN0cmluZ2lmeShhKSk7XG4gIHJldHVybiBhO1xufVxuXG5mdW5jdGlvbiByZVNvcnRBZ2FpbihhOiBJU3RhdGUpIHtcbiAgdmFyIHNvcnRJbmRleGVzID0gYS5pbmRleExpc3RRQkVGaWx0ZXJlZC5zbGljZSgpOyAvLyByZWxldmFudCBpbmRleGVzXG4gIE9iamVjdC5rZXlzKGEuY29sU29ydERpcnMpLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbktleTogVFlfcmVjb3JkS2V5KSB7XG4gICAgdmFyIHNvcnREaXIgPSBhLmNvbFNvcnREaXJzW2NvbHVtbktleV07XG4gICAgc29ydEluZGV4ZXMuc29ydCgoaW5kZXhBLCBpbmRleEIpID0+IHtcbiAgICAgIHZhciByZWNBID0gYS5hbGxMb2FkZWRSZWNzW2luZGV4QV0gYXMgYW55O1xuICAgICAgdmFyIHJlY0IgPSBhLmFsbExvYWRlZFJlY3NbaW5kZXhBXVxuICAgICAgdmFyIHZhbHVlQSA9IGEuYWxsTG9hZGVkUmVjc1tpbmRleEFdW2NvbHVtbktleV07XG4gICAgICB2YXIgdmFsdWVCID0gYS5hbGxMb2FkZWRSZWNzW2luZGV4Ql1bY29sdW1uS2V5XTtcbiAgICAgIHZhciBzb3J0VmFsID0gMDtcbiAgICAgIGlmICh2YWx1ZUEgPiB2YWx1ZUIpIHtcbiAgICAgICAgc29ydFZhbCA9IDE7XG4gICAgICB9XG4gICAgICBpZiAodmFsdWVBIDwgdmFsdWVCKSB7XG4gICAgICAgIHNvcnRWYWwgPSAtMTtcbiAgICAgIH1cbiAgICAgIGlmIChzb3J0VmFsICE9PSAwICYmIHNvcnREaXIgPT09IFNvcnRUeXBlcy5BU0MpIHtcbiAgICAgICAgc29ydFZhbCA9IHNvcnRWYWwgKiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzb3J0VmFsO1xuICAgIH0pO1xuICB9KVxuICBhLnNvcnRJbmRleGVzID0gc29ydEluZGV4ZXM7XG4gIHJldHVybiBhO1xufVxuXG5cblxuZnVuY3Rpb24gYXBwbHlRQkUoYTogSVN0YXRlKSB7XG5cbiAgYS5pbmRleExpc3RRQkVGaWx0ZXJlZCA9IE9iamVjdC5rZXlzKGEuY29sdW1uc1FCRSkucmVkdWNlKCAocHJldiwgcWJlY29sIDogVFlfcmVjb3JkS2V5KSA9PlxuICAgIHtcbiAgICAgIHZhciB2YWwgPSBhLmNvbHVtbnNRQkVbcWJlY29sXTtcbiAgICAgIGlmKCF2YWwpIHtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9XG4gICAgICB2YWwgPSB2YWwudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiBwcmV2LmZpbHRlciggaW5kZXggPT4ge1xuICAgICAgICByZXR1cm4gYS5hbGxMb2FkZWRSZWNzW2luZGV4XVtxYmVjb2xdICYmIChhLmFsbExvYWRlZFJlY3NbaW5kZXhdW3FiZWNvbF0udG9Mb3dlckNhc2UoKS5pbmRleE9mKHZhbCkgPj0gMCk7XG4gICAgICB9KVxuICAgIH1cbiAgICxhLmluZGV4TGlzdFNlYXJjaEZpbHRlcmVkKTtcbiAgICByZXR1cm4gcmVTb3J0QWdhaW4oYSk7XG4gIH1cblxuLypcbmZ1bmN0aW9uIHBvc3RzQnlzZWFyY2hTdHIoc3RhdGUgPSB7XG4gIGFsbExvYWRlZFJlY3M6IFtdLCBpbmRleExpc3Q6IFtdLFxuICBjb2xTb3J0RGlyczoge30sXG4gIHNvcnRJbmRleGVzOiBbXSxcbiAgc2VhcmNoU3RyOiBcIlwiXG59IGFzIElTdGF0ZSwgYWN0aW9uOiBJQWN0aW9uIHwgSUFjdGlvblNvcnQpOiBJU3RhdGUge1xuICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG4gICAgY2FzZSAnUkVDRUlWRV9QT1NUUyc6XG4gICAgICB2YXIgYSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlKSBhcyBJU3RhdGU7IC8vIGNvcHkgb2Ygc3RhdGUhXG4gICAgICBhLmluZGV4TGlzdCA9IFtdO1xuICAgICAgYS5pbml0ID0gdHJ1ZTtcbiAgICAgIGFjdGlvbi5wb3N0cy5mb3JFYWNoKHAgPT4ge1xuICAgICAgICBhLmFsbExvYWRlZFJlY3NbcC5pXSA9IHAuZGF0YTtcbiAgICAgICAgYS5pbmRleExpc3QucHVzaChwLmkpO1xuICAgICAgfSk7XG4gICAgICBhLmluZGV4TGlzdCA9IGFjdGlvbi5pbmRleExpc3Q7XG4gICAgICByZVNvcnRBZ2FpbihhKTtcbiAgICAgIC8vYVthY3Rpb24uc2VhcmNoU3RyXSA9IGFjdGlvbi5wb3N0cy5tYXAocCA9PiBwLmRhdGEpO1xuICAgICAgLy8ge1xuICAgICAgLy8gIC4uLnN0YXRlLFxuICAgICAgLy8gIFthY3Rpb24uc2VhcmNoU3RyXTogYWN0aW9uLnBvc3RzXG4gICAgICAvL31cbiAgICAgIC8vY29uc29sZS5sb2coXCJwcm9jdWRlcyBzdGF0ZSBvbiBSRUNFSVZFX1BPU1RTIFwiICsgSlNPTi5zdHJpbmdpZnkoYSkpO1xuICAgICAgcmV0dXJuIGE7XG4gICAgY2FzZSAnU0VUX1NPUlQnOiB7XG4gICAgICB2YXIgYSA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlKSBhcyBJU3RhdGU7XG4gICAgICB2YXIgYWN0aW9uU29ydCA9IGFjdGlvbiBhcyBJQWN0aW9uU29ydDtcbiAgICAgIHJldHVybiBhcHBseVNvcnQoYSwgYWN0aW9uU29ydC5jb2x1bW5LZXksIGFjdGlvblNvcnQuc29ydERpcik7XG4gICAgfVxuICAgIGNhc2UgJ1NFVF9XSURUSCc6IHtcbiAgICAgIHZhciBhID0gKE9iamVjdCBhcyBhbnkpLmFzc2lnbih7fSwgc3RhdGUpIGFzIElTdGF0ZTtcbiAgICAgIHZhciBhY3Rpb25TZXRXaWR0aCA9IGFjdGlvbiBhcyBJQWN0aW9uU2V0V2lkdGg7XG4gICAgICBhLmNvbHVtbnNXaWR0aCA9IChPYmplY3QgYXMgYW55KS5hc3NpZ24oe30sIHN0YXRlLmNvbHVtbnNXaWR0aCk7XG4gICAgICBhLmNvbHVtbnNXaWR0aFthY3Rpb25TZXRXaWR0aC5jb2x1bW5LZXldID0gYWN0aW9uU2V0V2lkdGgubmV3Q29sdW1uV2lkdGg7XG4gICAgICByZXR1cm4gYXBwbHlTb3J0KGEsIGFjdGlvblNvcnQuY29sdW1uS2V5LCBhY3Rpb25Tb3J0LnNvcnREaXIpO1xuICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgLy9jb25zb2xlLmxvZyhcInJldHVybiBkZWZhdWx0IHN0YXRlIFwiICsgSlNPTi5zdHJpbmdpZnkoYSkpO1xuICAgICAgcmV0dXJuIHN0YXRlO1xuICB9XG59XG4qL1xuXG50eXBlIElSZWFkUmVjb3JkcyA9IHsgaTogbnVtYmVyLCBkYXRhOiBJUmVjb3JkIH1bXTtcblxudHlwZSBJc2VhcmNoU3RyID0gc3RyaW5nO1xuLy8gLS0tLS0tLS0tLS0tLS1cbi8vIGFjdGlvbiBjcmVhdG9yc1xuLy8gLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gZmlyZVNldFNlYXJjaFN0cmluZyhzZWFyY2hTdHI6IElzZWFyY2hTdHIpIDogSUFjdGlvblNldFNlYXJjaCB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ1NldFNlYXJjaFN0cmluZycsXG4gICAgc2VhcmNoU3RyXG4gIH07XG59XG5cblxuZnVuY3Rpb24gZmlyZU9uUmVzaXplKCkgOiBJQWN0aW9uIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnUmVzaXplZCdcbiAgfTtcbn1cblxuXG5mdW5jdGlvbiBmaXJlU2V0U29ydChjb2x1bW5LZXk6IFRZX3JlY29yZEtleSwgc29ydERpcjogc3RyaW5nKTogSUFjdGlvblNldENvbHVtblNvcnQge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdTZXRDb2x1bW5Tb3J0JyxcbiAgICBjb2x1bW5LZXksXG4gICAgc29ydERpclxuICB9O1xufVxuXG5mdW5jdGlvbiBmaXJlU2V0Q29sdW1uV2lkdGgoY29sdW1uS2V5OiBUWV9yZWNvcmRLZXksIG5ld0NvbHVtbldpZHRoOiBudW1iZXIpIDogSUFjdGlvblNldENvbHVtbldpZHRoIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnU2V0Q29sdW1uV2lkdGgnLFxuICAgIGNvbHVtbktleSxcbiAgICBuZXdDb2x1bW5XaWR0aFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIGZpcmVTZXRRQkUoY29sdW1uS2V5OiBUWV9yZWNvcmRLZXksIG5ld1FCRTogc3RyaW5nKSA6IElBY3Rpb25TZXRDb2x1bW5RQkUge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdTZXRDb2x1bW5RQkUnLFxuICAgIGNvbHVtbktleSxcbiAgICBuZXdRQkVcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmlyZUNsZWFyQWxsUUJFcygpIDogSUFjdGlvbkNsZWFyQWxsUUJFcyB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0NsZWFyQWxsUUJFcydcbiAgfTtcbn1cblxuXG5mdW5jdGlvbiBmaXJlUmVjZWl2ZVBvc3RzKHNlYXJjaFN0cjogSXNlYXJjaFN0ciwgZGF0YXJlYWQ6IElSZWFkUmVjb3JkcywgaW5kZXhMaXN0OiBudW1iZXJbXSkgOiBJQWN0aW9uUmVjZWl2ZVBvc3RzIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnUmVjZWl2ZVBvc3RzJyxcbiAgICBzZWFyY2hTdHI6IHNlYXJjaFN0cixcbiAgICBwb3N0czogZGF0YXJlYWQsXG4gICAgaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQgOiBpbmRleExpc3RcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmV0Y2hQb3N0cyhzdGF0ZTogSVN0YXRlKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZGlzcGF0Y2g6IGFueSkge1xuICAgIHZhciB0b0luZGljZXMgPVxuICAgICAgZmV0Y2goYCR7c3RhdGUuc2VhcmNoU3RyfWApXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXE6IGFueSkgeyByZXR1cm4geyBqc29uOiByZXEuanNvbiwgaW5kZXhMaXN0OiByZXEuaW5kZXhMaXN0IH07IH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXM6IGFueSkgeyByZXR1cm4gZGlzcGF0Y2goZmlyZVJlY2VpdmVQb3N0cyhzdGF0ZS5zZWFyY2hTdHIsIHJlcy5qc29uLCByZXMuaW5kZXhMaXN0KSkgfSk7XG4gICAgcmV0dXJuIHsgdGhlaGFuZGxlOiAxIH07XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZldGNoUG9zdHNJZk5lZWRlZChzZWFyY2hTdHI6IElTdGF0ZSwgZm9yY2U/IDpib29sZWFuKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZGlzcGF0Y2g6IGFueSwgZ2V0U3RhdGU6IGFueSkge1xuICAgIHtcbiAgICAgIGlmIChmb3JjZSB8fCAhZ2V0U3RhdGUoKS5zZWFyY2hTdHJpbmcuaW5pdCkge1xuICAgICAgICByZXR1cm4gZGlzcGF0Y2goZmV0Y2hQb3N0cyhzZWFyY2hTdHIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cblxuXG4vLyAtLS0tLS0tLS0tLS1cbi8vIGFwcFxuLy8gLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGxvZ2dlcihhOiBhbnkgLyp7IGdldFN0YXRlIH0qLykge1xuICAvLyBuZXh0ID0+IGFjdGlvbiA9PlxuICAvL1xuICAvL1xuICB2YXIgZ2V0U3RhdGUgPSBhLmdldFN0YXRlO1xuICByZXR1cm4gZnVuY3Rpb24gKG5leHQ6IGFueSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYWN0aW9uOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuaW5mbygnZGlzcGF0Y2hpbmcnLCBhY3Rpb24pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbmV4dChhY3Rpb24pO1xuICAgICAgY29uc29sZS5sb2coJ3N0YXRlIGFmdGVyJywgZ2V0U3RhdGUoKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH1cbn1cblxuLy9jb25zdCBjcmVhdGVTdG9yZVdpdGhNaWRkbGV3YXJlID0gY3JlYXRlU3RvcmUpO1xuXG5cbmNvbnN0IGNyZWF0ZVN0b3JlV2l0aE1pZGRsZXdhcmUgPSBhcHBseU1pZGRsZXdhcmUodGh1bmssIGxvZ2dlcikoY3JlYXRlU3RvcmUpO1xuY29uc3QgcmVkdWNlciA9IGNvbWJpbmVSZWR1Y2Vycyh7IHNlYXJjaFN0cmluZyB9KTsgLy8sIHBvc3RzQnlzZWFyY2hTdHIgfSk7XG5jb25zdCBzdG9yZSA9IGNyZWF0ZVN0b3JlV2l0aE1pZGRsZXdhcmUocmVkdWNlcik7XG4vL2l0aE1pZGRsZXdhcmUocmVkdWNlcik7XG5cbmZ1bmN0aW9uIGZldGNoRGF0YUZvck15QXBwKHByb3BzOiBhbnksIGZvcmNlID8gOmJvb2xlYW4gKSB7XG4gIGNvbnN0IHsgc2VhcmNoU3RyaW5nIH0gPSBwcm9wcztcbiAgcmV0dXJuIGZldGNoUG9zdHNJZk5lZWRlZChzZWFyY2hTdHJpbmcsIGZvcmNlKTtcbn1cblxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBwUHJvcHMgeyB2YWx1ZTogc3RyaW5nLCBkaXNwYXRjaDogYW55LCBzZWFyY2hTdHJpbmc6IElTdGF0ZSB9XG5cbi8vQHByb3ZpZGUoc3RvcmUpXG4vL0Bjb25uZWN0KHN0YXRlID0+IHN0YXRlKVxuY2xhc3MgTXlBcHAgZXh0ZW5kcyBDb21wb25lbnQ8QXBwUHJvcHMsIHVuZGVmaW5lZD4ge1xuXG4gIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgIGNvbnN0IHsgZGlzcGF0Y2ggfSA9IHRoaXMucHJvcHM7XG4gICAgZGlzcGF0Y2goZmV0Y2hEYXRhRm9yTXlBcHAodGhpcy5wcm9wcykpO1xuICB9XG5cbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhuZXh0UHJvcHM6IEFwcFByb3BzKSB7XG4gICAgY29uc3QgeyBkaXNwYXRjaCB9ID0gdGhpcy5wcm9wcztcbiAgICBpZiAobmV4dFByb3BzLnNlYXJjaFN0cmluZy5zZWFyY2hTdHIgIT09IHRoaXMucHJvcHMuc2VhcmNoU3RyaW5nLnNlYXJjaFN0cikge1xuICAgICAgZGlzcGF0Y2goZmV0Y2hEYXRhRm9yTXlBcHAobmV4dFByb3BzLCB0cnVlKSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlQ2hhbmdlKG5leHRzZWFyY2hTdHI6IHN0cmluZykge1xuICAgIHRoaXMucHJvcHMuZGlzcGF0Y2goZmlyZVNldFNlYXJjaFN0cmluZyhuZXh0c2VhcmNoU3RyKSk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGNvbnN0IHsgc2VhcmNoU3RyaW5nLCBkaXNwYXRjaCB9ID0gdGhpcy5wcm9wcztcbiAgICBjb25zdCBwb3N0cyA9IHNlYXJjaFN0cmluZy5hbGxMb2FkZWRSZWNzIHx8IFtdOyAvL3NlYXJjaFN0cltzZWFyY2hTdHJpbmddO1xuICAgIGNvbnN0IHNvcnRJbmRleGVzID0gc2VhcmNoU3RyaW5nLnNvcnRJbmRleGVzIHx8IFtdO1xuICAgIGNvbnN0IGNvbFNvcnREaXJzID0gc2VhcmNoU3RyaW5nLmNvbFNvcnREaXJzIHx8IHt9O1xuICAgIGNvbnN0IHNlYXJjaFN0ciA9IHNlYXJjaFN0cmluZy5zZWFyY2hTdHIgfHwgXCJcIjtcbiAgICAvL2NvbnNvbGUubG9nKFwiIHJlbmRlciBtYWluIGNvbXBvbmVudFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9wcykpO1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkgIDogYW55IHtcbiAgICAgICAgZGlzcGF0Y2goZmlyZU9uUmVzaXplKCkpO1xuICAgIH07XG4gICAgKHdpbmRvdyBhcyBhbnkpLm9ucmVzaXplID0gZm47XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdj5cbiAgICAgICAgPFBpY2tlciB2YWx1ZT17c2VhcmNoU3RyfVxuICAgICAgICAgIG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUNoYW5nZS5iaW5kKHRoYXQpfSAvPlxuICAgICAgICA8U29ydEV4YW1wbGUgcmVjb3Jkcz17cG9zdHN9XG4gICAgICAgIGNvbHVtbnNRQkVzPXt0aGlzLnByb3BzLnNlYXJjaFN0cmluZy5jb2x1bW5zUUJFfVxuICAgICAgICBjb2x1bW5zV2lkdGg9e3RoaXMucHJvcHMuc2VhcmNoU3RyaW5nLmNvbHVtbnNXaWR0aH1cbiAgICAgICAgY29sU29ydERpcnM9e2NvbFNvcnREaXJzfVxuICAgICAgICBzb3J0SW5kZXhlcz17c29ydEluZGV4ZXN9IGRpc3BhdGNoPXtkaXNwYXRjaH0gLz5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cbn1cblxuLy8gICAgICAgIDxQb3N0cyBwb3N0cz17cG9zdHN9IGRpc3BhdGNoPXtkaXNwYXRjaH0gLz5cbmV4cG9ydCBpbnRlcmZhY2UgUGlja2VyUHJvcHMgeyB2YWx1ZTogc3RyaW5nLCBvbkNoYW5nZTogYW55IH1cblxuXG5jbGFzcyBQaWNrZXIgZXh0ZW5kcyBDb21wb25lbnQ8UGlja2VyUHJvcHMsIHVuZGVmaW5lZD4ge1xuICByZW5kZXIoKSB7XG4gICAgY29uc3QgeyB2YWx1ZSwgb25DaGFuZ2V9ID0gdGhpcy5wcm9wcztcbiAgICByZXR1cm4gKFxuICAgICAgPGhlYWRlcj5cbiAgICAgICAgZnV6enkgc2VhcmNoOlxuICAgICAgICA8aW5wdXQgY2xhc3NOYW1lPVwic2VhcmNoSW5wdXRcIiB0eXBlPVwidGV4dFwiIHN0eWxlPXt7IGhlaWdodDogXCIzMHB4XCIsIHdpZHRoIDogXCI4MCVcIiwgYWxpZ246XCJsZWZ0XCJ9fSBvbkNoYW5nZT17ZSA9PiBvbkNoYW5nZShlLnRhcmdldC52YWx1ZSl9IHZhbHVlPXt2YWx1ZX0gLz5cbiAgICAgIDwvaGVhZGVyPlxuICAgICk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIElQb3N0IHtcbiAgZGF0YToge1xuICAgIHRpdGxlOiBzdHJpbmdcbiAgfVxufTtcblxuaW50ZXJmYWNlIElQb3N0cyB7XG4gIHBvc3RzOiBJUmVjb3JkW10sXG4gIGRpc3BhdGNoOiBhbnlcbn1cblxuaW50ZXJmYWNlIElQb3N0UmVjb3JkIHtcbiAgcmVjb3JkOiBJUmVjb3JkXG59XG5cbmZ1bmN0aW9uIHBsdWNrPFQsIEsgZXh0ZW5kcyBrZXlvZiBUPihvOiBULCBuYW1lOiBLKTogVFtLXSB7XG4gIHJldHVybiBvW25hbWVdO1xufVxuXG5cbmNsYXNzIExpbmUgZXh0ZW5kcyBDb21wb25lbnQ8SVBvc3RSZWNvcmQsIHVuZGVmaW5lZD4ge1xuICByZW5kZXIoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDx0ciBrZXk9e3RoaXMucHJvcHMucmVjb3JkLmFwcElkfT5cbiAgICAgICAge2NvbHVtbnMubWFwKChjb2wpID0+XG4gICAgICAgICAgPHRkIGtleT17dGhpcy5wcm9wcy5yZWNvcmQuYXBwSWQgKyAnICcgKyBjb2x9ID5cbiAgICAgICAgICAgIHtwbHVjayh0aGlzLnByb3BzLnJlY29yZCwgY29sKX1cbiAgICAgICAgICA8L3RkPlxuICAgICAgICApfVxuICAgICAgPC90cj5cbiAgICApO1xuICB9XG59XG5cbi8qXG5jbGFzcyBQb3N0cyBleHRlbmRzIENvbXBvbmVudDxJUG9zdHMsIHVuZGVmaW5lZD4ge1xuICByZW5kZXIoKSB7XG4gICAgaWYgKCF0aGlzLnByb3BzLnBvc3RzKSB7XG4gICAgICByZXR1cm4gPHA+Tm90aGluZyBoZXJlIHlldC4uLjwvcD47XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlclBvc3RzKCk7XG4gICAgfVxuICB9XG5cbiAgb25DaGFuZ2VGaWx0ZXIoY29sOiBzdHJpbmcsIHJlczogc3RyaW5nKSB7XG4gICAgdGhpcy5wcm9wcy5kaXNwYXRjaChjb2wsIHJlcyk7XG4gIH1cblxuICByZW5kZXJQb3N0cygpIHtcbiAgICB2YXIgb25DaGFuZ2VGID0gdGhpcy5vbkNoYW5nZUZpbHRlciBhcyBhbnk7XG4gICAgcmV0dXJuIChcbiAgICAgIDx0YWJsZT5cbiAgICAgICAgPHRoZWFkPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgIHtjb2x1bW5zLm1hcCgoY29sKSA9PlxuICAgICAgICAgICAgICA8dGgga2V5PXtcInRoXCIgKyBjb2x9PlxuICAgICAgICAgICAgICAgIHtjb2x1bW5MYWJlbHNbY29sXX1cbiAgICAgICAgICAgICAgPC90aD5cblxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L3RyPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgIHtjb2x1bW5zLm1hcCgoY29sKSA9PlxuICAgICAgICAgICAgICA8dGgga2V5PXtjb2wgKyBcInhcIn0+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJ7Y29sfVwiIG9uQ2hhbmdlPXtlID0+IG9uQ2hhbmdlRihjb2wsIGUudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgPC90aD5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC90cj5cbiAgICAgICAgPC90aGVhZD5cbiAgICAgICAgPHRib2R5PlxuICAgICAgICAgIHt0aGlzLnByb3BzLnBvc3RzLm1hcCgocG9zdCwgaSkgPT5cbiAgICAgICAgICAgIDxMaW5lIGtleT17cG9zdC5hcHBJZCArICdfbCd9IHJlY29yZD17cG9zdH0gLz5cbiAgICAgICAgICApfVxuICAgICAgICA8L3Rib2R5PlxuICAgICAgPC90YWJsZT5cbiAgICApO1xuICB9XG59XG5cbiovXG5pbXBvcnQgKiBhcyBSZWFjdERPTSBmcm9tIFwicmVhY3QtZG9tXCI7XG5cbi8vICAgPGxpIGtleT17aX0+e3Bvc3QuZGF0YS50aXRsZX08L2xpPlxuXG5cbnZhciBQb3N0ID0gY29ubmVjdChtYXBTdGF0ZSkoTXlBcHApO1xuXG5cbnZhciBNWUFwcCA9IGNvbm5lY3QoXG4gIG1hcFN0YXRlXG4pKE15QXBwKTtcblxuUmVhY3RET00ucmVuZGVyKFxuICA8UHJvdmlkZXIgc3RvcmU9e3N0b3JlfT5cbiAgICA8TVlBcHAgLz5cbiAgPC9Qcm92aWRlcj4sXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250YWluZXInKVxuKTtcblxuZnVuY3Rpb24gbWFwU3RhdGUoc3RhdGU6IGFueSkge1xuICByZXR1cm4gc3RhdGU7XG59XG5cbi8vZnVuY3Rpb24gbWFwRGlzcGF0Y2hUb1Byb3BzKGRpc3BhdGNoKSB7XG4vLyAgcmV0dXJuIHsgYWN0aW9uczogYmluZEFjdGlvbkNyZWF0b3JzKGFjdGlvbkNyZWF0b3JzLCBkaXNwYXRjaCkgfTtcbi8vfVxuXG5cblxuLy9NeUFwcC5wcm9wVHlwZXMgPSB7XG4vLyAgY291bnRlcjogUHJvcFR5cGVzLm51bWJlci5pc1JlcXVpcmVkLFxuLy8gIGFjdGlvbnM6IFByb3BUeXBlcy5vYmplY3QuaXNSZXF1aXJlZFxuLy99O1xuXG4iLCIvL2ltcG9ydCAqIGFzIFByb21pc2UgZnJvbSAnZXM2LXNoaW0nO1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGQsIGIpIHtcbiAgICAgICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbiAgICB9O1xufSkoKTtcbnZhciBfX2Fzc2lnbiA9ICh0aGlzICYmIHRoaXMuX19hc3NpZ24pIHx8IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24odCkge1xuICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpXG4gICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICB9XG4gICAgcmV0dXJuIHQ7XG59O1xudmFyIF9fcmVzdCA9ICh0aGlzICYmIHRoaXMuX19yZXN0KSB8fCBmdW5jdGlvbiAocywgZSkge1xuICAgIHZhciB0ID0ge307XG4gICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXG4gICAgICAgIHRbcF0gPSBzW3BdO1xuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDApXG4gICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcbiAgICByZXR1cm4gdDtcbn07XG52YXIgcmVhY3RfMSA9IHJlcXVpcmUoXCJyZWFjdFwiKTtcbnZhciBSZWFjdCA9IHJlcXVpcmUoXCJyZWFjdFwiKTtcbnZhciByZWR1eF8xID0gcmVxdWlyZShcInJlZHV4XCIpO1xudmFyIHJlYWN0X3JlZHV4XzEgPSByZXF1aXJlKFwicmVhY3QtcmVkdXhcIik7XG52YXIgTUFYV0lEVEggPSA1NzA7XG52YXIgTUlOV0lEVEggPSAzMDtcbjtcbi8vdHlwZXMgdSA9IGtleW9mIElSZWNvcmQ7XG52YXIgdSA9IFwiYXBwSWRcIjtcbi8qXG5cImFwcElkXCIsXG4gICAgICAgICAgICBcIkFwcEtleVwiLFxuICAgICAgICAgICAgXCJBcHBOYW1lXCIsXG4gICAgICAgICAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiLFxuICAgICAgICAgICAgICAgIFwiUm9sZU5hbWVcIixcbiAgICAgICAgICAgICAgICBcIkFwcGxpY2F0aW9uVHlwZVwiLFxuICAgICAgICAgICAgICAgIFwiQlNQTmFtZVwiLFxuICAgICAgICAgICAgICAgIFwiQlNQQXBwbGljYXRpb25VUkxcIixcbiAgICAgICAgICAgICAgICBcInJlbGVhc2VOYW1lXCIsXG4gICAgICAgICAgICAgICAgXCJCdXNpbmVzc0NhdGFsb2dcIixcbiovXG52YXIgY29sdW1ucyA9IFtcbiAgICAnYXBwSWQnLFxuICAgIFwiZmlvcmkgaW50ZW50XCIsXG4gICAgJ0FwcE5hbWUnLFxuICAgICdBcHBsaWNhdGlvbkNvbXBvbmVudCcsXG4gICAgXCJCU1BOYW1lXCIsXG4gICAgXCJyZWxlYXNlTmFtZVwiLFxuICAgIFwiQnVzaW5lc3NDYXRhbG9nXCIsXG5dO1xuLy9rZXlvZiBJUmVjb3JkW107XG52YXIgY29sdW1uc1dpZHRoID0gW1xuICAgIHsgaWQ6ICdhcHBJZCcsXG4gICAgICAgIHdpZHRoOiA1MCB9LFxuICAgIFwiZmlvcmkgaW50ZW50XCIsXG4gICAgJ0FwcE5hbWUnLFxuICAgICdBcHBsaWNhdGlvbkNvbXBvbmVudCcsXG4gICAgXCJCU1BOYW1lXCIsXG4gICAgXCJyZWxlYXNlTmFtZVwiLFxuICAgIFwiQnVzaW5lc3NDYXRhbG9nXCJcbl07XG52YXIgY29sdW1uTGFiZWxzID0ge307XG5jb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbCkge1xuICAgIGNvbHVtbkxhYmVsc1tjb2xdID0gY29sO1xufSk7XG52YXIgcmVjb3JkcyA9IFt7XG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gICAgICAgIFwiYXBwSWRcIjogXCJGMTc2NlwiLFxuICAgICAgICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgICAgICAgXCJhcHBJZFwiOiBcIkYxN2RkZGQ2Njc3N1wiLFxuICAgICAgICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgICAgICAgXCJhcHBJZFwiOiBcIkYxN2RkZGQ2ZGRkZGRkZGRkZGRkZGRkZGQ2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZGQ0NDQ0NDQ0NDRkZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZGRkZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZDk5OTY2NDI0MzUzOTk5ZGZhc2Zhc2ZkZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZDEyMzQyYWFhYTE0NDEzZGRkZGRkNjZcIixcbiAgICAgICAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gICAgICAgIFwiYXBwSWRcIjogXCJGMTdkOTk5OTk5ZGRkYmJiYmI2NlwiLFxuICAgICAgICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgICAgICAgXCJhcHBJZFwiOiBcIkYxN2RkNTVyd3I1NTU1ZGQ2YWVyd2VyZXdyNlwiLFxuICAgICAgICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgICAgICAgXCJhcHBJZFwiOiBcIkYxN2Q5OTk5MTExMTEyMjJkZDIyMjI5OWRkZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZGRkZDNzc3NzNDEyMzQyNDI2NlwiLFxuICAgICAgICBcIkFwcE5hbWVcIjogXCJTcGVjaWFsIEcvTCBQb3N0aW5nXCIsXG4gICAgICAgIFwiQXBwbGljYXRpb25Db21wb25lbnRcIjogXCJGSS1GSU8tQVJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJmaW9yaSBpbnRlbnRcIjogXCJuL2FcIixcbiAgICAgICAgXCJhcHBJZFwiOiBcIkYxN2Q5OTk5OTlkZGFkZmZmZmZmZmZmZmZkNjZcIixcbiAgICAgICAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gICAgICAgIFwiYXBwSWRcIjogXCJGMTdkZGRkNjI0MTI0MTI2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZDk5OTk5OTMxNDIzNDMxMmRkZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZGRkcXdlcXdlcnF3ZXJxd3F3ZDY2XCIsXG4gICAgICAgIFwiQXBwTmFtZVwiOiBcIlNwZWNpYWwgRy9MIFBvc3RpbmdcIixcbiAgICAgICAgXCJBcHBsaWNhdGlvbkNvbXBvbmVudFwiOiBcIkZJLUZJTy1BUlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgICBcImZpb3JpIGludGVudFwiOiBcIm4vYVwiLFxuICAgICAgICBcImFwcElkXCI6IFwiRjE3ZHJycnJ3ZXR3ZXJ0ZDc3N2RkNjZ5eXlcIixcbiAgICAgICAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiZmlvcmkgaW50ZW50XCI6IFwibi9hXCIsXG4gICAgICAgIFwiYXBwSWRcIjogXCJGMTdkZDg4OHFyd3Jyd2VyOGQ2ZXdlcndlcjZcIixcbiAgICAgICAgXCJBcHBOYW1lXCI6IFwiU3BlY2lhbCBHL0wgUG9zdGluZ1wiLFxuICAgICAgICBcIkFwcGxpY2F0aW9uQ29tcG9uZW50XCI6IFwiRkktRklPLUFSXCIsXG4gICAgfVxuXTtcbi8qXG4gICAgICB0cyB0aW1lc3RhbXAgcHJpbWFyeSBrZXksXG4gICAgICAgICAgcmVjb3Jkbm8gaW50IG5vdCBudWxsLFxuICAgICAgICAgIGdlbmVyYXRpb25zIGludCBub3QgbnVsbCxcbiAgICAgICAgICBib3RpZCB2YXJjaGFyKDEwKSBub3QgbnVsbCxcbiAgICAgICAgICB1c2VyaWQgdmFyY2hhcig0MCkgbm90IG51bGwsXG4gICAgICAgICAgbWVzc2FnZSB2YXJjaGFyKDEwMjQpIG5vdCBudWxsLFxuICAgICAgICAgIHJlc3BvbnNlIHZhcmNoYXIoMTAyNCkgbm90IG51bGwsXG4gICAgICAgICAgYWN0aW9uIHZhcmNoYXIoNTEyKSBub3QgbnVsbCxcbiAgICAgICAgICBpbnRlbnQgdmFyY2hhcigyMCkgbm90IG51bGwsXG4gICAgICAgICAgY29udmVyc2F0aW9uaWQgdmFyY2hhcig0MCkgbm90IG51bGwsXG4gICAgICAgICAgZGVsdGEgaW50IG5vdCBudWxsLFxuICAgICAgICAgIHN0YXR1cyB2YXJjaGFyKDEwKSBub3QgbnVsbCxcbiAgICAgICAgICBtZXRhIGpzb25cbiovXG5yZWNvcmRzID0gd2luZG93LmJvbWRhdGEgfHwgcmVjb3JkcztcbmZ1bmN0aW9uIHByb2R1Y2VTZWFyY2hSZXN1bHQoc2VhcmNoU3RyaW5nKSB7XG4gICAgdmFyIHUgPSB3aW5kb3cuZWxhc3RpYztcbiAgICBpZiAoc2VhcmNoU3RyaW5nKSB7XG4gICAgICAgIGlmICh1KSB7XG4gICAgICAgICAgICB2YXIgciA9IHUuc2VhcmNoKHNlYXJjaFN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoby5yZWYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlY29yZHMubWFwKGZ1bmN0aW9uIChyLCBpbmRleCkgeyByZXR1cm4gaW5kZXg7IH0pO1xufVxuLypcbnNlbGVjdCBhIGJ1bmNoIG9mIHJlcXVlc3RlZCBpbmRpY2VzLFxuKi9cbmZ1bmN0aW9uIGZldGNoKGlucHV0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNlYXJjaCBmb3I6IFwiICsgaW5wdXQpO1xuICAgICAgICAgICAgdmFyIGluZGljZXMgPSBwcm9kdWNlU2VhcmNoUmVzdWx0KGlucHV0KTtcbiAgICAgICAgICAgIHZhciByZWNNYXAgPSBbXTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIGluZGljZXMuZm9yRWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgIGlmIChpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goeyBpOiBpLCBkYXRhOiByZWNvcmRzW2ldIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHJlcyA9IHtcbiAgICAgICAgICAgICAgICBqc29uOiByZXN1bHQsXG4gICAgICAgICAgICAgICAgaW5kZXhMaXN0OiBpbmRpY2VzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVzb2x2ZShyZXMpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0pO1xufVxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbnZhciBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRmFrZU9iamVjdERhdGFMaXN0U3RvcmUoLypudW1iZXIqLyBzaXplLCByZWNvcmRzKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemUgfHwgMDtcbiAgICAgICAgdGhpcy5fY2FjaGUgPSByZWNvcmRzIHx8IFtdO1xuICAgICAgICAvLyB0aGlzLl9jYWNoZSA9IFtdO1xuICAgIH1cbiAgICBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlRmFrZVJvd09iamVjdERhdGEgPSBmdW5jdGlvbiAoLypudW1iZXIqLyBpbmRleCkge1xuICAgICAgICB2YXIgdSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVjb3Jkc1tpbmRleCAlIDJdKSk7XG4gICAgICAgIHUuYXBwSWQgPSBcImFhYVwiICsgaW5kZXg7XG4gICAgICAgIHJldHVybiB1O1xuICAgIH07XG4gICAgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUucHJvdG90eXBlLmdldE9iamVjdEF0ID0gZnVuY3Rpb24gKC8qbnVtYmVyKi8gaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+IHRoaXMuc2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fY2FjaGVbaW5kZXhdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlW2luZGV4XSA9IHRoaXMuY3JlYXRlRmFrZVJvd09iamVjdERhdGEoaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWNoZVtpbmRleF07XG4gICAgfTtcbiAgICAvKipcbiAgICAqIFBvcHVsYXRlcyB0aGUgZW50aXJlIGNhY2hlIHdpdGggZGF0YS5cbiAgICAqIFVzZSB3aXRoIENhdXRpb24hIEJlaGF2ZXMgc2xvd2x5IGZvciBsYXJnZSBzaXplc1xuICAgICogZXguIDEwMCwwMDAgcm93c1xuICAgICovXG4gICAgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlLmxlbmd0aCA8IHRoaXMuc2l6ZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0T2JqZWN0QXQoaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlLnNsaWNlKCk7XG4gICAgfTtcbiAgICBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgICB9O1xuICAgIHJldHVybiBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZTtcbn0oKSk7XG4vL3ZhciBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZSA9IHJlcXVpcmUoJy4vaGVscGVycy9GYWtlT2JqZWN0RGF0YUxpc3RTdG9yZScpO1xudmFyIEZpeGVkRGF0YVRhYmxlID0gcmVxdWlyZSgnZml4ZWQtZGF0YS10YWJsZScpO1xudmFyIFRhYmxlID0gRml4ZWREYXRhVGFibGUuVGFibGUsIENvbHVtbiA9IEZpeGVkRGF0YVRhYmxlLkNvbHVtbiwgQ2VsbCA9IEZpeGVkRGF0YVRhYmxlLkNlbGw7XG52YXIgU29ydFR5cGVzID0ge1xuICAgIEFTQzogJ0FTQycsXG4gICAgREVTQzogJ0RFU0MnLFxufTtcbmZ1bmN0aW9uIHJldmVyc2VTb3J0RGlyZWN0aW9uKHNvcnREaXIpIHtcbiAgICByZXR1cm4gc29ydERpciA9PT0gU29ydFR5cGVzLkRFU0MgPyBTb3J0VHlwZXMuQVNDIDogU29ydFR5cGVzLkRFU0M7XG59XG52YXIgU29ydEhlYWRlckNlbGwgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTb3J0SGVhZGVyQ2VsbCwgX3N1cGVyKTtcbiAgICAvL29uU29ydENoYW5nZT8gOiBhbnk7XG4gICAgLy9zb3J0RGlyIDogYW55O1xuICAgIC8vY29sdW1uS2V5IDogYW55O1xuICAgIGZ1bmN0aW9uIFNvcnRIZWFkZXJDZWxsKHByb3BzKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IF9zdXBlci5jYWxsKHRoaXMsIHByb3BzKSB8fCB0aGlzO1xuICAgICAgICBfdGhpcy5fb25Tb3J0Q2hhbmdlID0gX3RoaXMuX29uU29ydENoYW5nZS5iaW5kKF90aGlzKTtcbiAgICAgICAgX3RoaXMuX29uUUJFQ2hhbmdlID0gX3RoaXMuX29uUUJFQ2hhbmdlLmJpbmQoX3RoaXMpO1xuICAgICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuICAgIFNvcnRIZWFkZXJDZWxsLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBfYSA9IHRoaXMucHJvcHMsIHNvcnREaXIgPSBfYS5zb3J0RGlyLCBjaGlsZHJlbiA9IF9hLmNoaWxkcmVuLCBxYmUgPSBfYS5xYmUsIHByb3BzID0gX19yZXN0KF9hLCBbXCJzb3J0RGlyXCIsIFwiY2hpbGRyZW5cIiwgXCJxYmVcIl0pO1xuICAgICAgICAvLyB7Li4ucHJvcHN9PlxuICAgICAgICByZXR1cm4gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ2VsbCwgbnVsbCxcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHsgb25DbGljazogdGhpcy5fb25Tb3J0Q2hhbmdlIH0sXG4gICAgICAgICAgICAgICAgY2hpbGRyZW4sXG4gICAgICAgICAgICAgICAgXCIgXCIsXG4gICAgICAgICAgICAgICAgc29ydERpciA/IChzb3J0RGlyID09PSBTb3J0VHlwZXMuREVTQyA/ICcmIzk2NjA74oaTJyA6ICcmIzk2NTA74oaRJykgOiAnJyksXG4gICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksXG4gICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgc3R5bGU6IHsgd2lkdGg6IFwiMTAwJVwiLCBib3JkZXJMZWZ0V2lkdGg6IFwiMHB4XCIgfSwgdmFsdWU6IHFiZSwgb25DaGFuZ2U6IGZ1bmN0aW9uIChlKSB7IHJldHVybiBfdGhpcy5fb25RQkVDaGFuZ2UoZS50YXJnZXQudmFsdWUpOyB9IH0pKSk7XG4gICAgfTtcbiAgICBTb3J0SGVhZGVyQ2VsbC5wcm90b3R5cGUuX29uUUJFQ2hhbmdlID0gZnVuY3Rpb24gKG5ld1FCRSkge1xuICAgICAgICBpZiAodGhpcy5wcm9wcy5vblFCRUNoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5wcm9wcy5vblFCRUNoYW5nZSh0aGlzLnByb3BzLmNvbHVtbktleSwgbmV3UUJFKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU29ydEhlYWRlckNlbGwucHJvdG90eXBlLl9vblNvcnRDaGFuZ2UgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlmICh0aGlzLnByb3BzLm9uU29ydENoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5wcm9wcy5vblNvcnRDaGFuZ2UodGhpcy5wcm9wcy5jb2x1bW5LZXksIHRoaXMucHJvcHMuc29ydERpciA/XG4gICAgICAgICAgICAgICAgcmV2ZXJzZVNvcnREaXJlY3Rpb24odGhpcy5wcm9wcy5zb3J0RGlyKSA6XG4gICAgICAgICAgICAgICAgU29ydFR5cGVzLkRFU0MpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gU29ydEhlYWRlckNlbGw7XG59KFJlYWN0LkNvbXBvbmVudCkpO1xudmFyIFRleHRDZWxsID0gZnVuY3Rpb24gKF9hKSB7XG4gICAgdmFyIHJvd0luZGV4ID0gX2Eucm93SW5kZXgsIGRhdGEgPSBfYS5kYXRhLCBjb2x1bW5LZXkgPSBfYS5jb2x1bW5LZXksIHByb3BzID0gX19yZXN0KF9hLCBbXCJyb3dJbmRleFwiLCBcImRhdGFcIiwgXCJjb2x1bW5LZXlcIl0pO1xuICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChDZWxsLCBfX2Fzc2lnbih7IHRpdGxlOiBkYXRhLmdldE9iamVjdEF0KHJvd0luZGV4KVtjb2x1bW5LZXldIH0sIHByb3BzKSxcbiAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7IHRpdGxlOiBkYXRhLmdldE9iamVjdEF0KHJvd0luZGV4KVtjb2x1bW5LZXldIH0sXG4gICAgICAgICAgICBkYXRhLmdldE9iamVjdEF0KHJvd0luZGV4KVtjb2x1bW5LZXldLFxuICAgICAgICAgICAgXCIgXCIpKSk7XG59O1xudmFyIERhdGFMaXN0V3JhcHBlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGF0YUxpc3RXcmFwcGVyKGluZGV4TWFwLCBkYXRhKSB7XG4gICAgICAgIHRoaXMuX2luZGV4TWFwID0gaW5kZXhNYXAgfHwgW107XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgIH1cbiAgICBEYXRhTGlzdFdyYXBwZXIucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleE1hcC5sZW5ndGg7XG4gICAgfTtcbiAgICBEYXRhTGlzdFdyYXBwZXIucHJvdG90eXBlLmdldE9iamVjdEF0ID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kYXRhLmdldE9iamVjdEF0KHRoaXMuX2luZGV4TWFwW2luZGV4XSk7XG4gICAgfTtcbiAgICByZXR1cm4gRGF0YUxpc3RXcmFwcGVyO1xufSgpKTtcbnZhciBNeUxpbmtDZWxsID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXlMaW5rQ2VsbCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBNeUxpbmtDZWxsKCkge1xuICAgICAgICByZXR1cm4gX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gICAgfVxuICAgIE15TGlua0NlbGwucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF9hID0gdGhpcy5wcm9wcywgcm93SW5kZXggPSBfYS5yb3dJbmRleCwgZmllbGQgPSBfYS5maWVsZCwgZGF0YSA9IF9hLmRhdGEsIGxhYmVsID0gX2EubGFiZWwsIHByb3BzID0gX19yZXN0KF9hLCBbXCJyb3dJbmRleFwiLCBcImZpZWxkXCIsIFwiZGF0YVwiLCBcImxhYmVsXCJdKTtcbiAgICAgICAgdmFyIHJlY29yZCA9IGRhdGEuZ2V0T2JqZWN0QXQocm93SW5kZXgpO1xuICAgICAgICB2YXIgY2VsbHVybCA9IHJlY29yZFtmaWVsZF07XG4gICAgICAgIHZhciBjZWxsbGFiZWwgPSByZWNvcmRbbGFiZWxdO1xuICAgICAgICByZXR1cm4gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ2VsbCwgX19hc3NpZ24oe30sIHByb3BzKSxcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHsgaHJlZjogY2VsbHVybCwgdGFyZ2V0OiBcIl9ibGFua1wiIH0sXG4gICAgICAgICAgICAgICAgXCIgQSBcIixcbiAgICAgICAgICAgICAgICBjZWxsbGFiZWwpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gTXlMaW5rQ2VsbDtcbn0oUmVhY3QuQ29tcG9uZW50KSk7XG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0KCkge1xuICAgIHZhciB3ID0gd2luZG93LCBkID0gZG9jdW1lbnQsIGUgPSBkLmRvY3VtZW50RWxlbWVudCwgZyA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXSwgeCA9IHcuaW5uZXJXaWR0aCB8fCBlLmNsaWVudFdpZHRoIHx8IGcuY2xpZW50V2lkdGgsIHkgPSB3LmlubmVySGVpZ2h0IHx8IGUuY2xpZW50SGVpZ2h0IHx8IGcuY2xpZW50SGVpZ2h0O1xuICAgIHJldHVybiB7IGhlaWdodDogeSwgd2lkdGg6IHggfTtcbn1cbjtcbnZhciBTb3J0RXhhbXBsZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFNvcnRFeGFtcGxlLCBfc3VwZXIpO1xuICAgIC8vICBfZGF0YUxpc3Q6IGFueTtcbiAgICAvLyAgc3RhdGU6IGFueTtcbiAgICBmdW5jdGlvbiBTb3J0RXhhbXBsZShwcm9wcykge1xuICAgICAgICB2YXIgX3RoaXMgPSBfc3VwZXIuY2FsbCh0aGlzLCBwcm9wcykgfHwgdGhpcztcbiAgICAgICAgLy9jb25zb2xlLmxvZygnIGhlcmUgcHJvcHMnICsgSlNPTi5zdHJpbmdpZnkocHJvcHMucmVjb3JkcykpXG4gICAgICAgIC8vICB0aGlzLl9kYXRhTGlzdCA9IG5ldyBGYWtlT2JqZWN0RGF0YUxpc3RTdG9yZSgyMCwgcHJvcHMucmVjb3Jkcyk7XG4gICAgICAgIDsgLy9uZXcgRmFrZU9iamVjdERhdGFMaXN0U3RvcmUoMjAwMCk7XG4gICAgICAgIHZhciBzaXplID0gMTA7IC8vdGhpcy5fZGF0YUxpc3QuZ2V0U2l6ZSgpO1xuICAgICAgICAvKiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgICBzb3J0ZWREYXRhWExpc3Q6IHRoaXMuX2RhdGFMaXN0LFxuICAgICAgICAgICAgICBjb2xTb3J0RGlyczoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgICovXG4gICAgICAgIF90aGlzLl9vbkNvbHVtblJlc2l6ZUVuZENhbGxiYWNrID0gX3RoaXMuX29uQ29sdW1uUmVzaXplRW5kQ2FsbGJhY2suYmluZChfdGhpcyk7XG4gICAgICAgIF90aGlzLl9vblNvcnRDaGFuZ2UgPSBfdGhpcy5fb25Tb3J0Q2hhbmdlLmJpbmQoX3RoaXMpO1xuICAgICAgICBfdGhpcy5fb25Db2x1bW5RQkVDaGFuZ2UgPSBfdGhpcy5fb25Db2x1bW5RQkVDaGFuZ2UuYmluZChfdGhpcyk7XG4gICAgICAgIHJldHVybiBfdGhpcztcbiAgICB9XG4gICAgO1xuICAgIFNvcnRFeGFtcGxlLnByb3RvdHlwZS5fb25Db2x1bW5SZXNpemVFbmRDYWxsYmFjayA9IGZ1bmN0aW9uIChuZXdDb2x1bW5XaWR0aCwgY29sdW1uS2V5KSB7XG4gICAgICAgIHRoaXMucHJvcHMuZGlzcGF0Y2goZmlyZVNldENvbHVtbldpZHRoKGNvbHVtbktleSwgbmV3Q29sdW1uV2lkdGgpKTtcbiAgICB9O1xuICAgIFNvcnRFeGFtcGxlLnByb3RvdHlwZS5fb25Db2x1bW5RQkVDaGFuZ2UgPSBmdW5jdGlvbiAoY29sdW1uS2V5LCBuZXdRQkUpIHtcbiAgICAgICAgdGhpcy5wcm9wcy5kaXNwYXRjaChmaXJlU2V0UUJFKGNvbHVtbktleSwgbmV3UUJFKSk7XG4gICAgfTtcbiAgICBTb3J0RXhhbXBsZS5wcm90b3R5cGUuX29uQ2xlYXJBbGxRQkVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnByb3BzLmRpc3BhdGNoKGZpcmVDbGVhckFsbFFCRXMoKSk7XG4gICAgfTtcbiAgICBTb3J0RXhhbXBsZS5wcm90b3R5cGUuX29uU29ydENoYW5nZSA9IGZ1bmN0aW9uIChjb2x1bW5LZXksIHNvcnREaXIpIHtcbiAgICAgICAgdGhpcy5wcm9wcy5kaXNwYXRjaChmaXJlU2V0U29ydChjb2x1bW5LZXksIHNvcnREaXIpKTtcbiAgICB9O1xuICAgIFNvcnRFeGFtcGxlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHZhciB7IC8qc29ydGVkRGF0YUxpc3QsIHNvcnRJbmRleGVzLCAgY29sU29ydERpcnMqL30gPSB0aGlzLnN0YXRlO1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgX2RhdGFMaXN0ID0gbmV3IEZha2VPYmplY3REYXRhTGlzdFN0b3JlKHRoaXMucHJvcHMucmVjb3JkcyAmJiB0aGlzLnByb3BzLnJlY29yZHMubGVuZ3RoLCB0aGlzLnByb3BzLnJlY29yZHMpO1xuICAgICAgICB2YXIgY29sU29ydERpcnMgPSB0aGlzLnByb3BzLmNvbFNvcnREaXJzO1xuICAgICAgICB2YXIgc2l6ZSA9IF9kYXRhTGlzdC5nZXRTaXplKCk7XG4gICAgICAgIHZhciBzb3J0SW5kZXhlcyA9IHRoaXMucHJvcHMuc29ydEluZGV4ZXMgfHwgW107XG4gICAgICAgIHZhciBzb3J0SW5kZXhlcyA9IHNvcnRJbmRleGVzLnNsaWNlKDAsIDIwKTtcbiAgICAgICAgdmFyIGNvbHVtbnNXaWR0aCA9IHRoaXMucHJvcHMuY29sdW1uc1dpZHRoO1xuICAgICAgICB0aGlzLl9vbkNsZWFyQWxsUUJFcyA9IHRoaXMuX29uQ2xlYXJBbGxRQkVzLmJpbmQodGhpcyk7XG4gICAgICAgIHZhciBzb3J0ZWREYXRhTGlzdCA9IG5ldyBEYXRhTGlzdFdyYXBwZXIoc29ydEluZGV4ZXMsIF9kYXRhTGlzdCk7IC8vdGhpcy5fZGF0YUxpc3QpLFxuICAgICAgICAvL2NvbnNvbGUubG9nKCcgaGVyZSBwcm9wcycgKyBKU09OLnN0cmluZ2lmeSh0aGlzLnByb3BzKSlcbiAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGlzIHRoZSBzaXplIFwiICsgc29ydGVkRGF0YUxpc3QuZ2V0U2l6ZSgpKTtcbiAgICAgICAgcmV0dXJuIChSZWFjdC5jcmVhdGVFbGVtZW50KFRhYmxlLCBfX2Fzc2lnbih7IHJvd0hlaWdodDogNDAsIHJvd3NDb3VudDogc29ydGVkRGF0YUxpc3QuZ2V0U2l6ZSgpLCBoZWFkZXJIZWlnaHQ6IDYwLCBvbkNvbHVtblJlc2l6ZUVuZENhbGxiYWNrOiB0aGlzLl9vbkNvbHVtblJlc2l6ZUVuZENhbGxiYWNrLCBpc0NvbHVtblJlc2l6aW5nOiBmYWxzZSwgd2lkdGg6IGdldENsaWVudFJlY3QoKS53aWR0aCAtIDI4LCBoZWlnaHQ6IGdldENsaWVudFJlY3QoKS5oZWlnaHQgLSA0MCB9LCB0aGlzLnByb3BzKSxcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ29sdW1uLCB7IGhlYWRlcjogUmVhY3QuY3JlYXRlRWxlbWVudChDZWxsLCBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcImxpbmtcIixcbiAgICAgICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLFxuICAgICAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIsIHsgdmFsdWU6IFwiYXZhbHVlXCIsIHRpdGxlOiBcImNsZWFyIGFsbCBRdWVyeSBmaWVsZHMgXCIsIGNsYXNzTmFtZTogXCJidG5jbGVhcmFsbFwiLCBvbkNsaWNrOiB0aGlzLl9vbkNsZWFyQWxsUUJFcyB9LCBcIiBjbGVhciBhbGwgXFx1MjVCN1wiKSxcbiAgICAgICAgICAgICAgICAgICAgXCIgXCIpLCBjZWxsOiBSZWFjdC5jcmVhdGVFbGVtZW50KE15TGlua0NlbGwsIHsgZGF0YTogc29ydGVkRGF0YUxpc3QsIGZpZWxkOiBcInVyaVwiLCBsYWJlbDogXCJBcHBLZXlcIiB9KSwgd2lkdGg6IDEwMCB9KSxcbiAgICAgICAgICAgIGNvbHVtbnMubWFwKGZ1bmN0aW9uIChjb2wpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChDb2x1bW4sIHsga2V5OiBjb2wsIGNvbHVtbktleTogY29sLCB3aWR0aDogY29sdW1uc1dpZHRoW2NvbF0gfHwgMTUwLCBpc1Jlc2l6YWJsZTogdHJ1ZSwgbWluV2lkdGg6IE1JTldJRFRILCBtYXhXaWR0aDogTUFYV0lEVEgsIGhlYWRlcjogUmVhY3QuY3JlYXRlRWxlbWVudChTb3J0SGVhZGVyQ2VsbCwgeyBvblNvcnRDaGFuZ2U6IF90aGlzLl9vblNvcnRDaGFuZ2UsIHFiZTogX3RoaXMucHJvcHMuY29sdW1uc1FCRXNbY29sXSB8fCBcIlwiLCBvblFCRUNoYW5nZTogX3RoaXMuX29uQ29sdW1uUUJFQ2hhbmdlLCBzb3J0RGlyOiBjb2xTb3J0RGlyc1tjb2xdIH0sIGNvbCksIGNlbGw6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoVGV4dENlbGwsIHsgZGF0YTogc29ydGVkRGF0YUxpc3QgfSkgfSk7XG4gICAgICAgICAgICB9KSkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNvcnRFeGFtcGxlO1xufShSZWFjdC5Db21wb25lbnQpKTtcbmZ1bmN0aW9uIGtleVRvSW5kZXgoa2V5KSB7XG4gICAgcmV0dXJuIGNvbHVtbnMuaW5kZXhPZihrZXkpO1xufVxuZnVuY3Rpb24gdXBkYXRlSGFzaChhKSB7XG4gICAgdmFyIGhzaCA9IFwiL3dcIjtcbiAgICB2YXIgd2lkdGggPSBnZXRDbGllbnRSZWN0KCkud2lkdGg7XG4gICAgaHNoICs9IE9iamVjdC5rZXlzKGEuY29sdW1uc1dpZHRoKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgaSA9IGtleVRvSW5kZXgoa2V5KTtcbiAgICAgICAgcmV0dXJuIGkgKyBcIj1cIiArICgxMDAgKiBhLmNvbHVtbnNXaWR0aFtrZXldIC8gd2lkdGgpLnRvRml4ZWQoMSk7XG4gICAgfSkuam9pbihcIiZcIik7XG4gICAgaHNoICs9IFwiL3FcIjtcbiAgICBoc2ggKz0gT2JqZWN0LmtleXMoYS5jb2x1bW5zUUJFKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICB2YXIgaSA9IGtleVRvSW5kZXgoa2V5KTtcbiAgICAgICAgcmV0dXJuIGkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChhLmNvbHVtbnNRQkVba2V5XSk7XG4gICAgfSkuam9pbihcIiZcIik7XG4gICAgaHNoICs9IFwiL3NcIiArIGVuY29kZVVSSUNvbXBvbmVudChhLnNlYXJjaFN0cikgKyBcIi9cIjtcbiAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhzaDtcbiAgICByZXR1cm4gYTtcbn1cbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9odHRwczovL2dpc3QuZ2l0aHViLmNvbS9nYWVhcm9uLzA3NGIwOTA1MzM3YTZhODM1ZDgyXG52YXIgcmVkdXhfdGh1bmtfMSA9IHJlcXVpcmUoXCJyZWR1eC10aHVua1wiKTtcbjtcbjtcbjtcbjtcbjtcbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgIHZhciBhcmdzID0gaGFzaC5zcGxpdCgnLycpO1xuICAgIHZhciBhU3RhdGUgPSB7XG4gICAgICAgIGNsaWVudFJlY3Q6IGdldENsaWVudFJlY3QoKSxcbiAgICAgICAgYWxsTG9hZGVkUmVjczogW10sIGluZGV4TGlzdDogW10sXG4gICAgICAgIGNvbFNvcnREaXJzOiB7fSxcbiAgICAgICAgY29sdW1uc1FCRToge30sXG4gICAgICAgIHNvcnRJbmRleGVzOiBbXSxcbiAgICAgICAgaW5pdDogZmFsc2UsXG4gICAgICAgIGluZGV4TGlzdFFCRUZpbHRlcmVkOiBbXSxcbiAgICAgICAgaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQ6IFtdLFxuICAgICAgICBjb2x1bW5zV2lkdGg6IHt9LFxuICAgICAgICBzZWFyY2hTdHI6IFwiN1wiXG4gICAgfTtcbiAgICBhcmdzLmZvckVhY2goZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgaWYgKG8uY2hhckF0KDApID09PSAndycpIHtcbiAgICAgICAgICAgIHZhciBjb2xzID0gby5zdWJzdHJpbmcoMSkuc3BsaXQoJyYnKTtcbiAgICAgICAgICAgIGNvbHMuZm9yRWFjaChmdW5jdGlvbiAoY29sKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGNvbC5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGMgPSBjb2x1bW5zW3BhcnNlSW50KHJlc1swXSldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IE1hdGgubWluKE1BWFdJRFRILCBNYXRoLm1heChNSU5XSURUSCwgTWF0aC5yb3VuZChhU3RhdGUuY2xpZW50UmVjdC53aWR0aCAqIHBhcnNlRmxvYXQocmVzWzFdKSAvIDEwMCkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSBcIm51bWJlclwiICYmIHZhbCAhPT0gTmFOKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYVN0YXRlLmNvbHVtbnNXaWR0aFtjXSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvLmNoYXJBdCgwKSA9PT0gJ3MnKSB7XG4gICAgICAgICAgICBhU3RhdGUuc2VhcmNoU3RyID0gZGVjb2RlVVJJQ29tcG9uZW50KG8uc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoby5jaGFyQXQoMCkgPT09ICdxJykge1xuICAgICAgICAgICAgdmFyIGNvbHMgPSBvLnN1YnN0cmluZygxKS5zcGxpdCgnJicpO1xuICAgICAgICAgICAgY29scy5mb3JFYWNoKGZ1bmN0aW9uIChjb2wpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gY29sLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uID0gcGFyc2VJbnQocmVzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb2x1bW4gPT09IFwibnVtYmVyXCIgJiYgY29sdW1uc1tjb2x1bW5dICYmIHJlc1sxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVN0YXRlLmNvbHVtbnNRQkVbY29sdW1uc1tjb2x1bW5dXSA9IGRlY29kZVVSSUNvbXBvbmVudChyZXNbMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYVN0YXRlO1xufVxuLy8gLS0tLS0tLS0tLS0tXG4vLyByZWR1Y2Vyc1xuLy8gLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBzZWFyY2hTdHJpbmcoc3RhdGUsIGFjdGlvbikge1xuICAgIGlmIChzdGF0ZSA9PT0gdm9pZCAwKSB7IHN0YXRlID0gZ2V0SW5pdGlhbFN0YXRlKCk7IH1cbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG4gICAgICAgIGNhc2UgJ1NldFNlYXJjaFN0cmluZyc6XG4gICAgICAgICAgICAvL3N0YXRlLnNlYXJjaFN0ciA9IGFjdGlvbi5zZWFyY2hTdHI7XG4gICAgICAgICAgICB2YXIgYSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlKTtcbiAgICAgICAgICAgIHZhciBhY3Rpb25TZXRTZWFyY2hTdHJpbmcgPSBhY3Rpb247XG4gICAgICAgICAgICBhLnNlYXJjaFN0ciA9IGFjdGlvblNldFNlYXJjaFN0cmluZy5zZWFyY2hTdHI7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiSGVyZSBzZWxlY3Qgc2FyY2ggc3RhdGUgXCIgKyBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgICAgICAgICAgdXBkYXRlSGFzaChhKTtcbiAgICAgICAgICAgIHJldHVybiBhOyAvLyBhY3Rpb24uc2VhcmNoU3RyO1xuICAgICAgICBjYXNlICdSZWNlaXZlUG9zdHMnOlxuICAgICAgICAgICAgdmFyIGEgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7IC8vIGNvcHkgb2Ygc3RhdGUhXG4gICAgICAgICAgICBhLmluaXQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGFjdGlvblJlY2VpdmVQb3N0cyA9IGFjdGlvbjtcbiAgICAgICAgICAgIGEuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQgPSBbXTtcbiAgICAgICAgICAgIGFjdGlvblJlY2VpdmVQb3N0cy5wb3N0cy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgICAgYS5hbGxMb2FkZWRSZWNzW3AuaV0gPSBwLmRhdGE7XG4gICAgICAgICAgICAgICAgYS5pbmRleExpc3RTZWFyY2hGaWx0ZXJlZC5wdXNoKHAuaSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGEuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQgPSBhY3Rpb25SZWNlaXZlUG9zdHMuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQ7XG4gICAgICAgICAgICBhID0gYXBwbHlRQkUoYSk7XG4gICAgICAgICAgICByZXR1cm4gcmVTb3J0QWdhaW4oYSk7XG4gICAgICAgIC8vYVthY3Rpb24uc2VhcmNoU3RyXSA9IGFjdGlvbi5wb3N0cy5tYXAocCA9PiBwLmRhdGEpO1xuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAuLi5zdGF0ZSxcbiAgICAgICAgLy8gIFthY3Rpb24uc2VhcmNoU3RyXTogYWN0aW9uLnBvc3RzXG4gICAgICAgIC8vfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwicHJvY3VkZXMgc3RhdGUgb24gUkVDRUlWRV9QT1NUUyBcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgICAgICAgY2FzZSAnUmVzaXplZCc6IHtcbiAgICAgICAgICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICAgICAgYS5jbGllbnRSZWN0ID0gZ2V0Q2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnU2V0Q29sdW1uU29ydCc6IHtcbiAgICAgICAgICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICAgICAgdmFyIGFjdGlvblNvcnQgPSBhY3Rpb247XG4gICAgICAgICAgICB2YXIgYSA9IGFwcGx5U29ydChhLCBhY3Rpb25Tb3J0LmNvbHVtbktleSwgYWN0aW9uU29ydC5zb3J0RGlyKTtcbiAgICAgICAgICAgIHVwZGF0ZUhhc2goYSk7XG4gICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlICdTZXRDb2x1bW5XaWR0aCc6IHtcbiAgICAgICAgICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICAgICAgdmFyIGFjdGlvblNldFdpZHRoID0gYWN0aW9uO1xuICAgICAgICAgICAgYS5jb2x1bW5zV2lkdGggPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5jb2x1bW5zV2lkdGgpO1xuICAgICAgICAgICAgYS5jb2x1bW5zV2lkdGhbYWN0aW9uU2V0V2lkdGguY29sdW1uS2V5XSA9IGFjdGlvblNldFdpZHRoLm5ld0NvbHVtbldpZHRoO1xuICAgICAgICAgICAgdXBkYXRlSGFzaChhKTtcbiAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ0NsZWFyQWxsUUJFcyc6IHtcbiAgICAgICAgICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICAgICAgYS5jb2x1bW5zUUJFID0ge307XG4gICAgICAgICAgICB1cGRhdGVIYXNoKGEpO1xuICAgICAgICAgICAgcmV0dXJuIGFwcGx5UUJFKGEpO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ1NldENvbHVtblFCRSc6IHtcbiAgICAgICAgICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICAgICAgdmFyIGFjdGlvblNldENvbHVtblFCRSA9IGFjdGlvbjtcbiAgICAgICAgICAgIGEuY29sdW1uc1FCRSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNvbHVtbnNRQkUpO1xuICAgICAgICAgICAgYS5jb2x1bW5zUUJFW2FjdGlvblNldENvbHVtblFCRS5jb2x1bW5LZXldID0gYWN0aW9uU2V0Q29sdW1uUUJFLm5ld1FCRTtcbiAgICAgICAgICAgIHVwZGF0ZUhhc2goYSk7XG4gICAgICAgICAgICByZXR1cm4gYXBwbHlRQkUoYSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJyZXR1cm4gZGVmYXVsdCBzdGF0ZSBcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG59XG5mdW5jdGlvbiBhcHBseVNvcnQoYSwgY29sdW1uS2V5LCBzb3J0RGlyKSB7XG4gICAgYS5jb2xTb3J0RGlycyA9IChfYSA9IHt9LCBfYVtjb2x1bW5LZXldID0gc29ydERpciwgX2EpO1xuICAgIHJlU29ydEFnYWluKGEpO1xuICAgIGNvbnNvbGUubG9nKFwicmV0dXJuIGRlZmF1bHQgc3RhdGUgb24gYXBwbHlTb3J0IFwiICsgSlNPTi5zdHJpbmdpZnkoYSkpO1xuICAgIHJldHVybiBhO1xuICAgIHZhciBfYTtcbn1cbmZ1bmN0aW9uIHJlU29ydEFnYWluKGEpIHtcbiAgICB2YXIgc29ydEluZGV4ZXMgPSBhLmluZGV4TGlzdFFCRUZpbHRlcmVkLnNsaWNlKCk7IC8vIHJlbGV2YW50IGluZGV4ZXNcbiAgICBPYmplY3Qua2V5cyhhLmNvbFNvcnREaXJzKS5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW5LZXkpIHtcbiAgICAgICAgdmFyIHNvcnREaXIgPSBhLmNvbFNvcnREaXJzW2NvbHVtbktleV07XG4gICAgICAgIHNvcnRJbmRleGVzLnNvcnQoZnVuY3Rpb24gKGluZGV4QSwgaW5kZXhCKSB7XG4gICAgICAgICAgICB2YXIgcmVjQSA9IGEuYWxsTG9hZGVkUmVjc1tpbmRleEFdO1xuICAgICAgICAgICAgdmFyIHJlY0IgPSBhLmFsbExvYWRlZFJlY3NbaW5kZXhBXTtcbiAgICAgICAgICAgIHZhciB2YWx1ZUEgPSBhLmFsbExvYWRlZFJlY3NbaW5kZXhBXVtjb2x1bW5LZXldO1xuICAgICAgICAgICAgdmFyIHZhbHVlQiA9IGEuYWxsTG9hZGVkUmVjc1tpbmRleEJdW2NvbHVtbktleV07XG4gICAgICAgICAgICB2YXIgc29ydFZhbCA9IDA7XG4gICAgICAgICAgICBpZiAodmFsdWVBID4gdmFsdWVCKSB7XG4gICAgICAgICAgICAgICAgc29ydFZhbCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsdWVBIDwgdmFsdWVCKSB7XG4gICAgICAgICAgICAgICAgc29ydFZhbCA9IC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnRWYWwgIT09IDAgJiYgc29ydERpciA9PT0gU29ydFR5cGVzLkFTQykge1xuICAgICAgICAgICAgICAgIHNvcnRWYWwgPSBzb3J0VmFsICogLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc29ydFZhbDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgYS5zb3J0SW5kZXhlcyA9IHNvcnRJbmRleGVzO1xuICAgIHJldHVybiBhO1xufVxuZnVuY3Rpb24gYXBwbHlRQkUoYSkge1xuICAgIGEuaW5kZXhMaXN0UUJFRmlsdGVyZWQgPSBPYmplY3Qua2V5cyhhLmNvbHVtbnNRQkUpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcWJlY29sKSB7XG4gICAgICAgIHZhciB2YWwgPSBhLmNvbHVtbnNRQkVbcWJlY29sXTtcbiAgICAgICAgaWYgKCF2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIHZhbCA9IHZhbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gcHJldi5maWx0ZXIoZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gYS5hbGxMb2FkZWRSZWNzW2luZGV4XVtxYmVjb2xdICYmIChhLmFsbExvYWRlZFJlY3NbaW5kZXhdW3FiZWNvbF0udG9Mb3dlckNhc2UoKS5pbmRleE9mKHZhbCkgPj0gMCk7XG4gICAgICAgIH0pO1xuICAgIH0sIGEuaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQpO1xuICAgIHJldHVybiByZVNvcnRBZ2FpbihhKTtcbn1cbi8vIC0tLS0tLS0tLS0tLS0tXG4vLyBhY3Rpb24gY3JlYXRvcnNcbi8vIC0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBmaXJlU2V0U2VhcmNoU3RyaW5nKHNlYXJjaFN0cikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdTZXRTZWFyY2hTdHJpbmcnLFxuICAgICAgICBzZWFyY2hTdHI6IHNlYXJjaFN0clxuICAgIH07XG59XG5mdW5jdGlvbiBmaXJlT25SZXNpemUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ1Jlc2l6ZWQnXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGZpcmVTZXRTb3J0KGNvbHVtbktleSwgc29ydERpcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdTZXRDb2x1bW5Tb3J0JyxcbiAgICAgICAgY29sdW1uS2V5OiBjb2x1bW5LZXksXG4gICAgICAgIHNvcnREaXI6IHNvcnREaXJcbiAgICB9O1xufVxuZnVuY3Rpb24gZmlyZVNldENvbHVtbldpZHRoKGNvbHVtbktleSwgbmV3Q29sdW1uV2lkdGgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnU2V0Q29sdW1uV2lkdGgnLFxuICAgICAgICBjb2x1bW5LZXk6IGNvbHVtbktleSxcbiAgICAgICAgbmV3Q29sdW1uV2lkdGg6IG5ld0NvbHVtbldpZHRoXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGZpcmVTZXRRQkUoY29sdW1uS2V5LCBuZXdRQkUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnU2V0Q29sdW1uUUJFJyxcbiAgICAgICAgY29sdW1uS2V5OiBjb2x1bW5LZXksXG4gICAgICAgIG5ld1FCRTogbmV3UUJFXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGZpcmVDbGVhckFsbFFCRXMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ0NsZWFyQWxsUUJFcydcbiAgICB9O1xufVxuZnVuY3Rpb24gZmlyZVJlY2VpdmVQb3N0cyhzZWFyY2hTdHIsIGRhdGFyZWFkLCBpbmRleExpc3QpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnUmVjZWl2ZVBvc3RzJyxcbiAgICAgICAgc2VhcmNoU3RyOiBzZWFyY2hTdHIsXG4gICAgICAgIHBvc3RzOiBkYXRhcmVhZCxcbiAgICAgICAgaW5kZXhMaXN0U2VhcmNoRmlsdGVyZWQ6IGluZGV4TGlzdFxuICAgIH07XG59XG5mdW5jdGlvbiBmZXRjaFBvc3RzKHN0YXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkaXNwYXRjaCkge1xuICAgICAgICB2YXIgdG9JbmRpY2VzID0gZmV0Y2goXCJcIiArIHN0YXRlLnNlYXJjaFN0cilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXEpIHsgcmV0dXJuIHsganNvbjogcmVxLmpzb24sIGluZGV4TGlzdDogcmVxLmluZGV4TGlzdCB9OyB9KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykgeyByZXR1cm4gZGlzcGF0Y2goZmlyZVJlY2VpdmVQb3N0cyhzdGF0ZS5zZWFyY2hTdHIsIHJlcy5qc29uLCByZXMuaW5kZXhMaXN0KSk7IH0pO1xuICAgICAgICByZXR1cm4geyB0aGVoYW5kbGU6IDEgfTtcbiAgICB9O1xufVxuZnVuY3Rpb24gZmV0Y2hQb3N0c0lmTmVlZGVkKHNlYXJjaFN0ciwgZm9yY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRpc3BhdGNoLCBnZXRTdGF0ZSkge1xuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoZm9yY2UgfHwgIWdldFN0YXRlKCkuc2VhcmNoU3RyaW5nLmluaXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGlzcGF0Y2goZmV0Y2hQb3N0cyhzZWFyY2hTdHIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG4vLyAtLS0tLS0tLS0tLS1cbi8vIGFwcFxuLy8gLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBsb2dnZXIoYSAvKnsgZ2V0U3RhdGUgfSovKSB7XG4gICAgLy8gbmV4dCA9PiBhY3Rpb24gPT5cbiAgICAvL1xuICAgIC8vXG4gICAgdmFyIGdldFN0YXRlID0gYS5nZXRTdGF0ZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKG5leHQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnZGlzcGF0Y2hpbmcnLCBhY3Rpb24pO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5leHQoYWN0aW9uKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGF0ZSBhZnRlcicsIGdldFN0YXRlKCkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICB9O1xufVxuLy9jb25zdCBjcmVhdGVTdG9yZVdpdGhNaWRkbGV3YXJlID0gY3JlYXRlU3RvcmUpO1xudmFyIGNyZWF0ZVN0b3JlV2l0aE1pZGRsZXdhcmUgPSByZWR1eF8xLmFwcGx5TWlkZGxld2FyZShyZWR1eF90aHVua18xLmRlZmF1bHQsIGxvZ2dlcikocmVkdXhfMS5jcmVhdGVTdG9yZSk7XG52YXIgcmVkdWNlciA9IHJlZHV4XzEuY29tYmluZVJlZHVjZXJzKHsgc2VhcmNoU3RyaW5nOiBzZWFyY2hTdHJpbmcgfSk7IC8vLCBwb3N0c0J5c2VhcmNoU3RyIH0pO1xudmFyIHN0b3JlID0gY3JlYXRlU3RvcmVXaXRoTWlkZGxld2FyZShyZWR1Y2VyKTtcbi8vaXRoTWlkZGxld2FyZShyZWR1Y2VyKTtcbmZ1bmN0aW9uIGZldGNoRGF0YUZvck15QXBwKHByb3BzLCBmb3JjZSkge1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBwcm9wcy5zZWFyY2hTdHJpbmc7XG4gICAgcmV0dXJuIGZldGNoUG9zdHNJZk5lZWRlZChzZWFyY2hTdHJpbmcsIGZvcmNlKTtcbn1cbi8vQHByb3ZpZGUoc3RvcmUpXG4vL0Bjb25uZWN0KHN0YXRlID0+IHN0YXRlKVxudmFyIE15QXBwID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoTXlBcHAsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTXlBcHAoKSB7XG4gICAgICAgIHJldHVybiBfc3VwZXIgIT09IG51bGwgJiYgX3N1cGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgdGhpcztcbiAgICB9XG4gICAgTXlBcHAucHJvdG90eXBlLmNvbXBvbmVudERpZE1vdW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGlzcGF0Y2ggPSB0aGlzLnByb3BzLmRpc3BhdGNoO1xuICAgICAgICBkaXNwYXRjaChmZXRjaERhdGFGb3JNeUFwcCh0aGlzLnByb3BzKSk7XG4gICAgfTtcbiAgICBNeUFwcC5wcm90b3R5cGUuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyA9IGZ1bmN0aW9uIChuZXh0UHJvcHMpIHtcbiAgICAgICAgdmFyIGRpc3BhdGNoID0gdGhpcy5wcm9wcy5kaXNwYXRjaDtcbiAgICAgICAgaWYgKG5leHRQcm9wcy5zZWFyY2hTdHJpbmcuc2VhcmNoU3RyICE9PSB0aGlzLnByb3BzLnNlYXJjaFN0cmluZy5zZWFyY2hTdHIpIHtcbiAgICAgICAgICAgIGRpc3BhdGNoKGZldGNoRGF0YUZvck15QXBwKG5leHRQcm9wcywgdHJ1ZSkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBNeUFwcC5wcm90b3R5cGUuaGFuZGxlQ2hhbmdlID0gZnVuY3Rpb24gKG5leHRzZWFyY2hTdHIpIHtcbiAgICAgICAgdGhpcy5wcm9wcy5kaXNwYXRjaChmaXJlU2V0U2VhcmNoU3RyaW5nKG5leHRzZWFyY2hTdHIpKTtcbiAgICB9O1xuICAgIE15QXBwLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdmFyIF9hID0gdGhpcy5wcm9wcywgc2VhcmNoU3RyaW5nID0gX2Euc2VhcmNoU3RyaW5nLCBkaXNwYXRjaCA9IF9hLmRpc3BhdGNoO1xuICAgICAgICB2YXIgcG9zdHMgPSBzZWFyY2hTdHJpbmcuYWxsTG9hZGVkUmVjcyB8fCBbXTsgLy9zZWFyY2hTdHJbc2VhcmNoU3RyaW5nXTtcbiAgICAgICAgdmFyIHNvcnRJbmRleGVzID0gc2VhcmNoU3RyaW5nLnNvcnRJbmRleGVzIHx8IFtdO1xuICAgICAgICB2YXIgY29sU29ydERpcnMgPSBzZWFyY2hTdHJpbmcuY29sU29ydERpcnMgfHwge307XG4gICAgICAgIHZhciBzZWFyY2hTdHIgPSBzZWFyY2hTdHJpbmcuc2VhcmNoU3RyIHx8IFwiXCI7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCIgcmVuZGVyIG1haW4gY29tcG9uZW50XCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLnByb3BzKSk7XG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRpc3BhdGNoKGZpcmVPblJlc2l6ZSgpKTtcbiAgICAgICAgfTtcbiAgICAgICAgd2luZG93Lm9ucmVzaXplID0gZm47XG4gICAgICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLFxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChQaWNrZXIsIHsgdmFsdWU6IHNlYXJjaFN0ciwgb25DaGFuZ2U6IHRoaXMuaGFuZGxlQ2hhbmdlLmJpbmQodGhhdCkgfSksXG4gICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFNvcnRFeGFtcGxlLCB7IHJlY29yZHM6IHBvc3RzLCBjb2x1bW5zUUJFczogdGhpcy5wcm9wcy5zZWFyY2hTdHJpbmcuY29sdW1uc1FCRSwgY29sdW1uc1dpZHRoOiB0aGlzLnByb3BzLnNlYXJjaFN0cmluZy5jb2x1bW5zV2lkdGgsIGNvbFNvcnREaXJzOiBjb2xTb3J0RGlycywgc29ydEluZGV4ZXM6IHNvcnRJbmRleGVzLCBkaXNwYXRjaDogZGlzcGF0Y2ggfSkpKTtcbiAgICB9O1xuICAgIHJldHVybiBNeUFwcDtcbn0ocmVhY3RfMS5Db21wb25lbnQpKTtcbnZhciBQaWNrZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhQaWNrZXIsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUGlja2VyKCkge1xuICAgICAgICByZXR1cm4gX3N1cGVyICE9PSBudWxsICYmIF9zdXBlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gICAgfVxuICAgIFBpY2tlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX2EgPSB0aGlzLnByb3BzLCB2YWx1ZSA9IF9hLnZhbHVlLCBvbkNoYW5nZSA9IF9hLm9uQ2hhbmdlO1xuICAgICAgICByZXR1cm4gKFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoZWFkZXJcIiwgbnVsbCxcbiAgICAgICAgICAgIFwiZnV6enkgc2VhcmNoOlwiLFxuICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHsgY2xhc3NOYW1lOiBcInNlYXJjaElucHV0XCIsIHR5cGU6IFwidGV4dFwiLCBzdHlsZTogeyBoZWlnaHQ6IFwiMzBweFwiLCB3aWR0aDogXCI4MCVcIiwgYWxpZ246IFwibGVmdFwiIH0sIG9uQ2hhbmdlOiBmdW5jdGlvbiAoZSkgeyByZXR1cm4gb25DaGFuZ2UoZS50YXJnZXQudmFsdWUpOyB9LCB2YWx1ZTogdmFsdWUgfSkpKTtcbiAgICB9O1xuICAgIHJldHVybiBQaWNrZXI7XG59KHJlYWN0XzEuQ29tcG9uZW50KSk7XG47XG5mdW5jdGlvbiBwbHVjayhvLCBuYW1lKSB7XG4gICAgcmV0dXJuIG9bbmFtZV07XG59XG52YXIgTGluZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKExpbmUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gTGluZSgpIHtcbiAgICAgICAgcmV0dXJuIF9zdXBlciAhPT0gbnVsbCAmJiBfc3VwZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCB0aGlzO1xuICAgIH1cbiAgICBMaW5lLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHJldHVybiAoUmVhY3QuY3JlYXRlRWxlbWVudChcInRyXCIsIHsga2V5OiB0aGlzLnByb3BzLnJlY29yZC5hcHBJZCB9LCBjb2x1bW5zLm1hcChmdW5jdGlvbiAoY29sKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcInRkXCIsIHsga2V5OiBfdGhpcy5wcm9wcy5yZWNvcmQuYXBwSWQgKyAnICcgKyBjb2wgfSwgcGx1Y2soX3RoaXMucHJvcHMucmVjb3JkLCBjb2wpKTtcbiAgICAgICAgfSkpKTtcbiAgICB9O1xuICAgIHJldHVybiBMaW5lO1xufShyZWFjdF8xLkNvbXBvbmVudCkpO1xuLypcbmNsYXNzIFBvc3RzIGV4dGVuZHMgQ29tcG9uZW50PElQb3N0cywgdW5kZWZpbmVkPiB7XG4gIHJlbmRlcigpIHtcbiAgICBpZiAoIXRoaXMucHJvcHMucG9zdHMpIHtcbiAgICAgIHJldHVybiA8cD5Ob3RoaW5nIGhlcmUgeWV0Li4uPC9wPjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyUG9zdHMoKTtcbiAgICB9XG4gIH1cblxuICBvbkNoYW5nZUZpbHRlcihjb2w6IHN0cmluZywgcmVzOiBzdHJpbmcpIHtcbiAgICB0aGlzLnByb3BzLmRpc3BhdGNoKGNvbCwgcmVzKTtcbiAgfVxuXG4gIHJlbmRlclBvc3RzKCkge1xuICAgIHZhciBvbkNoYW5nZUYgPSB0aGlzLm9uQ2hhbmdlRmlsdGVyIGFzIGFueTtcbiAgICByZXR1cm4gKFxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAge2NvbHVtbnMubWFwKChjb2wpID0+XG4gICAgICAgICAgICAgIDx0aCBrZXk9e1widGhcIiArIGNvbH0+XG4gICAgICAgICAgICAgICAge2NvbHVtbkxhYmVsc1tjb2xdfVxuICAgICAgICAgICAgICA8L3RoPlxuXG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAge2NvbHVtbnMubWFwKChjb2wpID0+XG4gICAgICAgICAgICAgIDx0aCBrZXk9e2NvbCArIFwieFwifT5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cIntjb2x9XCIgb25DaGFuZ2U9e2UgPT4gb25DaGFuZ2VGKGNvbCwgZS50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgICAgICAgICA8L3RoPlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L3RyPlxuICAgICAgICA8L3RoZWFkPlxuICAgICAgICA8dGJvZHk+XG4gICAgICAgICAge3RoaXMucHJvcHMucG9zdHMubWFwKChwb3N0LCBpKSA9PlxuICAgICAgICAgICAgPExpbmUga2V5PXtwb3N0LmFwcElkICsgJ19sJ30gcmVjb3JkPXtwb3N0fSAvPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvdGJvZHk+XG4gICAgICA8L3RhYmxlPlxuICAgICk7XG4gIH1cbn1cblxuKi9cbnZhciBSZWFjdERPTSA9IHJlcXVpcmUoXCJyZWFjdC1kb21cIik7XG4vLyAgIDxsaSBrZXk9e2l9Pntwb3N0LmRhdGEudGl0bGV9PC9saT5cbnZhciBQb3N0ID0gcmVhY3RfcmVkdXhfMS5jb25uZWN0KG1hcFN0YXRlKShNeUFwcCk7XG52YXIgTVlBcHAgPSByZWFjdF9yZWR1eF8xLmNvbm5lY3QobWFwU3RhdGUpKE15QXBwKTtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KHJlYWN0X3JlZHV4XzEuUHJvdmlkZXIsIHsgc3RvcmU6IHN0b3JlIH0sXG4gICAgUmVhY3QuY3JlYXRlRWxlbWVudChNWUFwcCwgbnVsbCkpLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFpbmVyJykpO1xuZnVuY3Rpb24gbWFwU3RhdGUoc3RhdGUpIHtcbiAgICByZXR1cm4gc3RhdGU7XG59XG4vL2Z1bmN0aW9uIG1hcERpc3BhdGNoVG9Qcm9wcyhkaXNwYXRjaCkge1xuLy8gIHJldHVybiB7IGFjdGlvbnM6IGJpbmRBY3Rpb25DcmVhdG9ycyhhY3Rpb25DcmVhdG9ycywgZGlzcGF0Y2gpIH07XG4vL31cbi8vTXlBcHAucHJvcFR5cGVzID0ge1xuLy8gIGNvdW50ZXI6IFByb3BUeXBlcy5udW1iZXIuaXNSZXF1aXJlZCxcbi8vICBhY3Rpb25zOiBQcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcbi8vfTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==

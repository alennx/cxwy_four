;
(function(angular) {
    'use strict';
    var indexOf = [].indexOf || function(item) {
            for (var i = 0, l = this.length; i < l; i++) {
                if (i in this && this[i] === item) return i;
            }
            return -1;
        };

    function isDescendant(parent, child) {
        var node = child.parentNode;
        while (node !== null) {
            if (node === parent) return true;
            node = node.parentNode;
        }
        return false;
    }

    angular.module('pickadate', [])

        .provider('pickadateI18n', function() {
            var defaults = {
                'prev': 'prev',
                'next': 'next'
            };

            this.translations = {};

            this.$get = function() {
                var translations = this.translations;

                return {
                    t: function(key) {
                        return translations[key] || defaults[key];
                    }
                };
            };
        })

        .factory('pickadateUtils', ['$locale', function($locale) {

            function getPartName(part) {
                switch (part) {
                    case 'dd':
                        return 'day';
                    case 'MM':
                        return 'month';
                    case 'yyyy':
                        return 'year';
                }
            }

            return {
                parseDate: function(dateString, format) {
                    if (!dateString) return;
                    if (angular.isDate(dateString)) return new Date(dateString);

                    format = format || 'yyyy-MM-dd';

                    var formatRegex = '(dd|MM|yyyy)',
                        separator = format.match(/[-|/]/)[0],
                        dateParts = dateString.split(separator),
                        regexp = new RegExp([formatRegex, formatRegex, formatRegex].join(separator)),
                        formatParts = format.match(regexp),
                        dateObj = {};

                    formatParts.shift();

                    angular.forEach(formatParts, function(part, i) {
                        dateObj[getPartName(part)] = parseInt(dateParts[i], 10);
                    });

                    if (isNaN(dateObj.year) || isNaN(dateObj.month) || isNaN(dateObj.day)) return;

                    return new Date(dateObj.year, dateObj.month - 1, dateObj.day, 3);
                },

                buildDates: function(date, options) {
                    date = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
                    var dates = [],
                        lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 3);

                    options = options || {};
                    date = new Date(date);

                    while (date.getDay() !== options.weekStartsOn) {
                        date.setDate(date.getDate() - 1);
                    }

                    for (var i = 0; i < 56; i++) { // 42 == 6 rows of dates
                        if (options.noExtraRows && date.getDay() === options.weekStartsOn && date > lastDate) break;

                        dates.push(new Date(date));
                        date.setDate(date.getDate() + 1);
                    }
                    return dates;
                },

                buildDayNames: function(weekStartsOn) {
                    var dayNames = $locale.DATETIME_FORMATS.SHORTDAY;
                    if (weekStartsOn) {
                        dayNames = dayNames.slice(0);
                        for (var i = 0; i < weekStartsOn; i++) {
                            dayNames.push(dayNames.shift());
                        }
                    }
                    return dayNames;
                },
                getNextDay: function(date) {
                    var next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                    return next;
                }
            };
        }])

        .directive('pickadate', ['$locale', '$sce', '$compile', '$document', '$window', 'pickadateUtils',
            'pickadateI18n', 'dateFilter', '$rootScope', '$filter', '$q','$location',
            function($locale, $sce, $compile, $document, $window, dateUtils, i18n, dateFilter, $rootScope, $filter, $q,$location) {
                var hpzl=$location.search().hpzl,hphm=$location.search().hphm;
                var TEMPLATE =
                    '<div class="item">'+
                    '<div class="title">当前车辆：<a>{{selectedChice.hphm}}</a></div>'+
                    '<select ng-change="change(selectedChice)" ng-model="selectedChice" ng-options="x.hphm for x in hplist"></select>'+
                    '</div>'+
                    '<div class="pickadate" ng-show="displayPicker" ng-style="styles">' +
                    '<div class="pickadate-header">' +
                    '<div class="pickadate-controls">' +
                    '<img class="pre" src="{{preImage}}" on-touch="onprePress()" on-release="onpreRelease()" ng-click="changeMonth(-1)" ng-show="allowPrevMonth">' +
                    '</img>' +
                    '<img class="next" src="{{nextImage}}" on-touch="onNextPress()" on-release="onNextRelease()"  ng-click="changeMonth(1)" ng-show="allowNextMonth">' +
                    '</img>' +
                    '</div>' +
                    '<div class="pickadate-centered-heading">' +
                    '{{currentDate | date:"yyyy年M月"}}' +
                    '</div>' +
                    '</div>' +
                    '<div class="pickadate-body">' +
                    '<div class="pickadate-main">' +
                    '<ul class="pickadate-cell">' +
                    '<li class="pickadate-head" ng-repeat="dayName in dayNames">' +
                    '{{dayName}}' +
                    '</li>' +
                    '</ul>' +
                    '<ul class="pickadate-cell">' +
                    '<li ng-repeat="d in dates |limitTo:42" ng-click="setDate(dates[$index+7])" ><div class="roundDiv" ng-class="classesFor(dates[$index+7])">' +
                    '{{dates[$index+7].dateObj | date:"d"}}</div><div class="pickadate-cell-des">{{dates[$index+7].des}}</div>' +
                    '</li>' +
                    '</ul>' +
                    '</div>' +
                    '</div>' +
                    '</div>';

                return {
                    require: 'ngModel',
                    scope: {
                        defaultDate: '=',
                        minDate: '=',
                        maxDate: '=',
                        dataname:'@',
                        disabledDates: '=',
                        noExtraRows: '@',
                        hphm: '=',
                        hpzl: '='
                    },

                    link: function(scope, element, attrs, ngModel) {
                        var hpString=$location.search().hplist,hplist=[];scope.hplist=[];
                        console.log(hpString);
                        if(hpString==undefined || hpString==''){
                            alert("未选择车辆传递，请重试");
                            return;
                        }
                        hplist=hpString.split(",");
                        for(var i=0;i<hplist.length;i++){
                            scope.hplist.push({hpzl:hplist[i].substr(0,2),hphm:hplist[i].substr(2,10)});
                        }
                        scope.selectedChice=scope.hplist[0];
                        localStorage.setItem("fourname",JSON.stringify(scope.selectedChice));//存储默认车辆
                        scope.change=function(item){
                            select(item);
                            localStorage.setItem("fourname",JSON.stringify(item));//存储选择车辆
                        };
                        var noExtraRows = scope.noExtraRows,
                            allowMultiple = attrs.hasOwnProperty('multiple'),
                            weekStartsOn = scope.weekStartsOn,
                            selectedDates = [],
                            wantsModal = element[0] instanceof HTMLInputElement,
                            compiledHtml = $compile(TEMPLATE)(scope),
                            format = (attrs.format || 'yyyy-MM-dd').replace(/m/g, 'M'),
                            minDate, maxDate;
                        scope.$on("appPause", function() {
                            deleteDate();
                        });
                        scope.displayPicker = !wantsModal;
                        scope.$watch(function() {
                            return attrs.needrefresh
                        }, function(value) {
                            render();
                        });
                        if (!angular.isNumber(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
                            weekStartsOn = 0;
                        }
                        // 前进后退图片
                        scope.preImage = "img/arrow-left.png";
                        scope.nextImage = "img/arrow-right.png";
                        scope.onprePress = function() {
                            scope.preImage = "img/arrow-left-click.png";
                        };
                        scope.onpreRelease = function() {
                            scope.preImage = "img/arrow-left.png";
                        };
                        scope.onNextPress = function() {
                            scope.nextImage = "img/arrow-right-click.png";
                        };
                        scope.onNextRelease = function() {
                            scope.nextImage = "img/arrow-right.png";
                        };
                        //scope.setDate = function(dateObjs) {
                        //    console.log(dateObjs);
                        //    for(var i in dateObjs){
                        //        console.log(dateObjs[i]);
                        //    }
                        //};
                        //点击选择时间点
                        scope.setDate = function(dateObjs) {
                            //if (isOutOfRange(dateObj.dateObj) || isDateDisabled(dateObj.date)) return;
                            selectedDates = allowMultiple ? toggleDate(dateObjs, selectedDates) : [dateObjs.date];
                            var hpname=JSON.parse(localStorage.getItem("fourname"));
                            //保存点击节点
                            var pickdates = JSON.parse(localStorage.getItem(hpname.hpzl+hpname.hphm+"pickdate")),temp=[],temparray=[],temp2=[];
                            if(pickdates!=null && pickdates!=undefined && pickdates!=[]){
                                for (var i = 0; i < pickdates.length; i++) {
                                    temp[pickdates[i].date] = true;
                                    temparray.push(pickdates[i]);
                                }
                                temp2=removeDuplicatedItem(selectedDates);
                                for (var j = 0; j < temp2.length; j++) {
                                    if (temp[temp2[j].date]==undefined) {
                                        temparray.push(temp2[j]);
                                    }else{
                                        temparray=find(temparray,temp2[j]);
                                    }
                                }
                                localStorage.setItem(hpname.hpzl+hpname.hphm+"pickdate",JSON.stringify(temparray));
                            }else{
                                //无保存记录
                                temparray=removeDuplicatedItem(selectedDates);
                                localStorage.setItem(hpname.hpzl+hpname.hphm+"pickdate",JSON.stringify(temparray));
                            }
                            setViewValue(selectedDates);
                            scope.displayPicker = !wantsModal;
                        };
                        //筛选同一时间不同类型点击
                        function find(temparray,selectedDates){
                            for(var i =0;i<temparray.length;i++){
                                if(temparray[i].date==selectedDates.date){
                                    if(selectedDates.des==''){
                                        temparray.splice(i,i);
                                    }else{
                                        temparray[i]=selectedDates;
                                    }
                                }
                            }
                            return temparray;
                        }
                        //数组去重
                        function removeDuplicatedItem(selectedDates) {
                            var arr=[];
                            for (var k = 0; k < selectedDates.length; k++) {
                                if (arr.indexOf(selectedDates[k]) === -1) {
                                    arr.push(selectedDates[k]);
                                }
                            }
                            return arr;
                        }
                        var $render = ngModel.$render = function(options) {
                            options = options || {};

                            if (angular.isArray(ngModel.$viewValue)) {
                                selectedDates = ngModel.$viewValue;
                            } else if (ngModel.$viewValue) {
                                selectedDates = [ngModel.$viewValue];
                            }

                            scope.currentDate = dateUtils.parseDate(scope.defaultDate, format) ||
                            dateUtils.parseDate(selectedDates[0], format) || new Date();

                            selectedDates = enabledDatesOf(selectedDates);

                            setViewValue(selectedDates, options);
                            render();
                        };

                        scope.classesFor = function(date) {
                            if (date.type == 1)
                                return date.classNames.concat("pickadate-implement");
                            if (date.type == 2)
                                return date.classNames.concat("pickadate-feasible");
                            if (date.type == 3)
                                return date.classNames.concat("pickadate-forbidden");
                            if (date.type == 4)
                                return date.classNames.concat("pickadate-holidy");
                            if (date.type == 5)
                                return date.classNames.concat("pickadate-prohibit");
                            return date.classNames;
                        };

                        scope.changeMonth = function(offset) {
                            // If the current date is January 31th, setting the month to date.getMonth() + 1
                            // sets the date to March the 3rd, since the date object adds 30 days to the current
                            // date. Settings the date to the 2nd day of the month is a workaround to prevent this
                            // behaviour
                            deleteDate().then(function() {
                                scope.currentDate.setDate(1);
                                scope.currentDate.setMonth(scope.currentDate.getMonth() + offset);
                                render();
                                window.setTimeout(function() {
                                }, 1500);
                            }, function() {
                                alert("保存记录出错");
                            });

                        };
                        scope.hello = function(event) {
                            console.log(event);
                        };

                        // Workaround to watch multiple properties. XXX use $scope.$watchGroup in angular 1.3
                        scope.$watch(function() {
                            return angular.toJson([scope.minDate, scope.maxDate, scope.disabledDates]);
                        }, function() {
                            minDate = dateUtils.parseDate(scope.minDate, format) || new Date(0);
                            maxDate = dateUtils.parseDate(scope.maxDate, format) || new Date(99999999999999);

                            $render();
                        });

                        // Insert datepicker into DOM
                        if (wantsModal) {
                            var togglePicker = function(toggle) {
                                scope.displayPicker = toggle;
                                scope.$apply();
                            };

                            element.on('focus', function() {
                                var supportPageOffset = $window.pageXOffset !== undefined,
                                    isCSS1Compat = (($document.compatMode || "") === "CSS1Compat"),
                                    scrollX = supportPageOffset ? $window.pageXOffset : isCSS1Compat ? $document.documentElement.scrollLeft : $document.body.scrollLeft,
                                    scrollY = supportPageOffset ? $window.pageYOffset : isCSS1Compat ? $document.documentElement.scrollTop : $document.body.scrollTop,
                                    innerWidth = $window.innerWidth || $document.documentElement.clientWidth || $document.body.clientWidth;

                                scope.styles = {
                                    top: scrollY + element[0].getBoundingClientRect().bottom + 'px'
                                };

                                if ((innerWidth - element[0].getBoundingClientRect().left) >= 300) {
                                    scope.styles.left = scrollX + element[0].getBoundingClientRect().left + 'px';
                                } else {
                                    scope.styles.right = innerWidth - element[0].getBoundingClientRect().right - scrollX + 'px';
                                }

                                togglePicker(true);
                            });

                            element.on('keydown', function(e) {
                                if (indexOf.call([9, 13, 27], e.keyCode) >= 0) togglePicker(false);
                            });

                            // if the user types a date, update the picker and set validity
                            scope.$watch(function() {
                                return ngModel.$viewValue;
                            }, function(val) {
                                var isValidDate = dateUtils.parseDate(val, format);

                                if (isValidDate) $render({
                                    skipRenderInput: true
                                });
                                ngModel.$setValidity('date', !!isValidDate);
                            });

                            $document.on('click', function(e) {
                                if (isDescendant(compiledHtml[0], e.target) || e.target === element[0]) return;
                                togglePicker(false);
                            });

                            // if the input element has a value, set it as the ng-model
                            scope.$$postDigest(function() {
                                if (attrs.value) {
                                    ngModel.$viewValue = attrs.value;
                                    $render();
                                }
                            });

                            element.after(compiledHtml.addClass('pickadate-modal'));
                        } else {
                            element.append(compiledHtml);
                        }

                        function render() {
                            var initialDate = new Date(scope.currentDate.getFullYear(), scope.currentDate.getMonth(), 1, 3),
                                currentMonth = initialDate.getMonth() + 1,
                                allDates = dateUtils.buildDates(initialDate, {
                                    weekStartsOn: weekStartsOn,
                                    noExtraRows: noExtraRows
                                }),
                                dates = [],
                                today = dateFilter(new Date(), format);
                            var nextMonthInitialDate = new Date(initialDate);

                            nextMonthInitialDate.setMonth(weekStartsOn);
                            scope.allowPrevMonth = !minDate || initialDate > minDate;
                            scope.allowNextMonth = !maxDate || nextMonthInitialDate <= maxDate;
                            scope.dayNames = dateUtils.buildDayNames(weekStartsOn);

                            for (var i = 0; i < allDates.length; i++) {
                                var classNames = [],
                                    dateObj = allDates[i],
                                    date = dateFilter(dateObj, format),
                                    isDisabled = isDateDisabled(date);

                                if (isOutOfRange(dateObj) || isDisabled) {
                                    classNames.push('pickadate-disabled');
                                } else {
                                    classNames.push('pickadate-enabled');
                                }

                                if (isDisabled) classNames.push('pickadate-unavailable');
                                if (date === today) classNames.push('pickadate-today');
                                //type:0表示正常，1表示选中，2表示可行，3表示禁止,4表示节假日,5表示违法行驶
                                dates.push({
                                    date: date,
                                    dateObj: dateObj,
                                    classNames: classNames,
                                    type: 0,
                                    des: ""
                                });

                            }

                            scope.dates = dates;
                            select('');
                        }
                        function setViewValue(value, options) {
                            options = options || {};
                            if (allowMultiple) {
                                ngModel.$setViewValue(value);
                            } else {
                                ngModel.$setViewValue(value[0]);
                            }
                            if (!options.skipRenderInput) element.val(ngModel.$viewValue);
                        }

                        function enabledDatesOf(dateArray) {
                            var resultArray = [];

                            for (var i = 0; i < dateArray.length; i++) {
                                var date = dateArray[i];

                                if (!isDateDisabled(date) && !isOutOfRange(dateUtils.parseDate(date, format))) {
                                    resultArray.push(date);
                                }
                            }

                            return resultArray;
                        }

                        function isOutOfRange(date) {
                            return date < minDate || date > maxDate || dateFilter(date, 'M') !== dateFilter(scope.currentDate, 'M');
                        }

                        function isDateDisabled(date) {
                            return indexOf.call(scope.disabledDates || [], date) >= 0;
                        }

                        function toggleDate(date, dateArray) {
                            var index = indexOf.call(scope.dates, date);
                            if (date.type == 3) {
                                console.log("禁止出行");
                                date.type = 5;
                            }else if (date.type == 4) {
                                console.log("节假日");
                                return dateArray;
                            }else if (date.type == 5) {
                                date.type = 3;
                            }else if (date.type == 1) {
                                date.type = 2;
                            } else {
                                date.type = 1;
                            }
                            refresh();
                            var index = indexOf.call(dateArray, date.date);
                            if (index === -1) {
                                dateArray.push(date);
                            } else {
                                dateArray.splice(index, 1);
                            }

                            return dateArray;
                        }
                        // 根据selectedDatas刷新feasibleDates,forbiddenDates
                        function refresh() {
                            //获取节假日
                            GetHolidays();
                            var mark = new Array(scope.dates.length);
                            for (var i = 0; i < scope.dates.length; i++) {
                                if (scope.dates[i].type == 1)
                                    mark[i] = 1;
                                else if(scope.dates[i].type == 5)
                                    mark[i] = 2;
                                else
                                    mark[i] = 0;
                                if (scope.dates[i].type != 4) {
                                    scope.dates[i].type = 0;
                                    scope.dates[i].des = "";
                                }
                            }
                            for (var i = 0; i < mark.length; i++) {
                                var ischeck = false,isIllegal=false;
                                if (mark[i] == 1 && scope.dates[i].type != 3) {
                                    ischeck = true;
                                    scope.dates[i].type = 1;
                                    scope.dates[i].des = "已开";
                                }

                                if (scope.dates[i].type == 2) {
                                    if (i > 0 && i < mark.length - 1 &&
                                        mark[i - 1] == 1 && mark[i + 1] == 1 && scope.dates[i + 1].type != 3)
                                        ischeck = true;

                                    if (i > 0 && i < mark.length - 2 && scope.dates[i + 1].type == 2 &&
                                        mark[i - 1] == 1 && mark[i + 2] == 1 && scope.dates[i + 2].type != 3) {
                                        ischeck = true;
                                    }
                                    if (i > 1 && i < mark.length - 1 && scope.dates[i - 1].type == 2 &&
                                        mark[i - 2] == 1 && mark[i + 1] == 1 && scope.dates[i + 1].type != 3) {
                                        ischeck = true;
                                    }
                                    scope.dates[i].type = 2;
                                    scope.dates[i].des = "可以开";
                                }
                                if (mark[i] == 2 && scope.dates[i].type == 3) {
                                    isIllegal=true;
                                    scope.dates[i].type = 5;
                                    scope.dates[i].des = "违法开";
                                }
                                if (ischeck) {
                                    for (var j = 1; j < 5; j++) {
                                        if (i + j < scope.dates.length && scope.dates[i + j].type != 3) {
                                            if (scope.dates[i + j].type == 4)
                                                break;
                                            if (j < 4) {
                                                scope.dates[i + j].type = 2;
                                                scope.dates[i + j].des = "可以开";
                                            } else {
                                                scope.dates[i + j].type = 3;
                                                scope.dates[i + j].des = "禁止开";
                                            }
                                        }
                                    }
                                }
                                if (isIllegal) {
                                    for (var j = 1; j < 6; j++) {
                                        if (i + j < scope.dates.length) {
                                            if (scope.dates[i + j].type == 4)
                                                break;
                                            if (j < 5) {
                                                scope.dates[i + j].type= 3;
                                                scope.dates[i + j].des = "禁止开";
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        function deleteDate() {
                            var defer = $q.defer();
                            var hpname=JSON.parse(localStorage.getItem("fourname"));
                            var pickdates = JSON.parse(localStorage.getItem(hpname.hpzl+hpname.hphm+"pickdate"));
                            if(pickdates!=null&&pickdates!=undefined){
                                var deletesql = "delete from chuxingriqi where hphm = \'" + scope.hphm + "\' and hpzl = \'" + scope.hpzl + "\' and date in (";
                                for (var i = 0; i < scope.dates.length; i++) {
                                    deletesql += "\'" + scope.dates[i].date + "\'";
                                    if (i != scope.dates.length - 1)
                                        deletesql += ",";
                                    else
                                        deletesql += ")"
                                }
                                insertDate(defer);
                            } else {
                                defer.resolve();
                            }
                            return defer.promise;
                        }

                        function insertDate(defer) {
                            var hpname=JSON.parse(localStorage.getItem("fourname"));
                            var pickdates = JSON.parse(localStorage.getItem(hpname.hpzl+hpname.hphm+"pickdate"));
                            if(pickdates!=null&&pickdates!=undefined){
                                var insertsql = "insert into chuxingriqi (hphm,hpzl,date,des,type) values";
                                for (var i = 0; i < scope.dates.length; i++) {
                                    var temp = scope.dates[i];
                                    insertsql += "(\"" + scope.hphm + "\",\"" + scope.hpzl + "\",\"" + temp.date + "\",\"" + temp.des + "\"," + temp.type + ")";
                                    if (i != scope.dates.length - 1)
                                        insertsql += ",";
                                }
                                defer.resolve();
                            } else {
                                defer.resolve();
                            }
                        }
                        //选取记录
                        function select(item) {
                            var hpname=JSON.parse(localStorage.getItem("fourname")),inialStates = [];
                            if(item!=''&&item!=undefined){
                                var pickdates = JSON.parse(localStorage.getItem(item.hpzl+item.hphm+"pickdate"));
                            }else{
                                pickdates = JSON.parse(localStorage.getItem(hpname.hpzl+hpname.hphm+"pickdate"));
                            }
                            if(pickdates!=null&&pickdates!=undefined){
                                if (pickdates.length > 0) {
                                    for (var i = 0; i < pickdates.length; i++) {
                                        inialStates[pickdates[i].date] = {
                                            type: pickdates[i].type,
                                            des: pickdates[i].des
                                        };
                                    }
                                    for (var i = 0; i < scope.dates.length; i++) {
                                        scope.dates[i].type = 0;
                                        scope.dates[i].des = "";
                                        var temp = inialStates[scope.dates[i].date];
                                        if (temp != null) {
                                            scope.dates[i].type = temp.type;
                                            scope.dates[i].des = temp.des;
                                        } else {
                                            scope.dates[i].type = 0;
                                            scope.dates[i].des = "";
                                        }
                                    }
                                }
                            }else{
                                for (var i = 0; i < scope.dates.length; i++) {
                                    scope.dates[i].type = 0;
                                    scope.dates[i].des = "";
                                }
                            }
                            refresh();
                        }
                        function GetHolidays(){
                            var holiday=holscl(),hols=[];
                            if(holiday!=null&&holiday!=undefined){
                                for (var i = 0; i < holiday.length; i++) {
                                    hols[holiday[i].date] = {
                                        type: holiday[i].type,
                                        des: holiday[i].des
                                    };
                                }
                                for (var i = 0; i < scope.dates.length; i++) {
                                    var temp = hols[scope.dates[i].date];
                                    if (temp != null) {
                                        scope.dates[i].type = temp.type;
                                        scope.dates[i].des = temp.des;
                                    }
                                }
                            }
                        }
                        function holscl(){
                            var holiday=holidays(),holitem={};
                            for (var i = 0; i < holiday.length; i++) {
                                holitem=holiday[i].date.split("/");
                                for(var j in holitem){
                                    holitem[j]=Appendzero(holitem[j]);
                                }
                                holiday[i].date=holitem[0]+"-"+holitem[1]+"-"+holitem[2];
                            }
                            return holiday;
                        }
                        function Appendzero (obj) {
                            if (obj < 10) return "0" + obj; else return obj;
                        }
                        function getMM(month) {
                            return month > 9 ? month : "0" + month;
                        }

                        function getAroundMonth(date) {
                            var month = date.getMonth() + 1;
                            var year = date.getFullYear();
                            var lastyear = year - 1;
                            var nextyear = year + 1;
                            if (month == 1)
                                return [lastyear + "-" + "12", year + "-" + "01", year + "-" + "02"];
                            if (month == 12)
                                return [year + "-" + "11", year + "-" + "12", nextyear + "-" + "01"];
                            return [year + "-" + getMM(month - 1), year + "-" + getMM(month), year + "-" + getMM(month + 1)];
                        }
                    }
                };
            }
        ]);
})(window.angular);

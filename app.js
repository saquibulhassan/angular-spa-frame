// APPLICATION START
var moduleApp = angular.module('spaApp', ['ngRoute', 'ngAnimate', 'ngFileUpload', 'ghiscoding.validation', 'toastr', 'ui.bootstrap', 'cp.ngConfirm', 'ngPrint', 'ui.tinymce', '720kb.datepicker']);

moduleApp.config(['$routeProvider', '$locationProvider', '$translateProvider', '$provide', '$httpProvider', 'toastrConfig', function($routeProvider, $locationProvider, $translateProvider, $provide, $httpProvider, toastrConfig){
    // has url prefix configuration
    $locationProvider.hashPrefix('');
    $routeProviderReference = $routeProvider;

    // form validation language configuration
    $translateProvider.preferredLanguage('en').fallbackLanguage('en').useSanitizeValueStrategy('escapeParameters').useStaticFilesLoader({
        prefix: 'assets/locales/',
        suffix: '/form_validation.json'
    });

    // toastr configuration
    angular.extend(toastrConfig, {
        allowHtml: true,
        closeButton: true,
        positionClass: 'toast-top-center',
        tapToDismiss: false,
        target: 'body',
    });

    // error handling for ajax request
    $provide.factory('ErrorInterceptor', ['$rootScope', '$q', '$injector', '$location', function ($rootScope, $q, $injector, $location) {
        return {
            responseError: function(rejection) {
                var toastr = $injector.get('toastr');
                
                switch(rejection.status) {
                    // login auth failed
                    case 401:
                        var error = angular.extend({title: 'Unauthorized', message: 'Sorry! You are not authorized. Please <a href="'+rejection.data.redirect+'" target="_blank">Click Here</a> to login again'}, rejection.data); 
                        toastr.error(error.message, error.title, {timeOut: 15000});
                        // throw new Error("Login Authentication Failed!");
                        break;
                    // form validation failed
                    case 422:
                        var error = angular.extend({title: 'Invalid Data', message: 'Please review your data & try again'}, rejection.data); 
                        toastr.error(error.message, error.title, {timeOut: 5000});
                        $rootScope[rejection.config.errorContainer] = rejection.data;
                        break;                    
                    default:
                        var message  = 'Please contact with support team for assistance.';
                        var title    = rejection.status+' : '+rejection.statusText;
                        toastr.error(message, title, {timeOut: 15000});
                        // show default error page when error occured
                        //$location.url('/error');
                }
                return $q.reject(rejection);
            }
        };
    }]);

    $httpProvider.interceptors.push('ErrorInterceptor');
}]);


/**!
 * Create dynamic routes and set loading configuration
 */
moduleApp.run(['$rootScope', '$location', '$route', '$document', '$window', 'httpApi', function($rootScope, $location, $route, $document, $window, httpApi) {
    // ajax request to inialize application
    httpApi.request({ url: APPURL.get('/bootstrap') }).then(function(response) {
        // append master data to rootScope
        angular.extend($rootScope, response.data);
        // generate dynamic routes
        angular.forEach($rootScope.menuList, function(v, k) {
            if(v.route != '#' && v.route != '') {
                $routeProviderReference.when(v.route, {
                    controller: 'MainController',
                    templateUrl: APPURL.get(v.templateUrl),
                    dataUrl: v.dataUrl,
                    pageTitle: v.pageTitle,
                    reloadOnSearch: false,
                });
            }
        });
        // set error page
        $routeProviderReference.when('/error', {
            templateUrl: APPURL.get('/angular/error'),
            controller: 'MainController',
            pageTitle: 'Whoops, looks like something went wrong.',
        });

        // error routes
        $routeProviderReference.otherwise({ redirectTo: '/dashboard' });
        $route.reload();
    });

    $rootScope.appLoading   = true; //show app loading
    $rootScope.loading      = true; // show content loading

    /*$rootScope.$on('$locationChangeSuccess', function() {
        console.log('Location change start');
    });*/

    $rootScope.$on('$routeChangeStart', function (event, next, current) {
        $rootScope.loading  = true; //show loading
    });
    $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
        $document[0].title      = current.$$route.pageTitle + ' | ' + $rootScope.appconfig.appTitle + ' | ' + $rootScope.appconfig.companyName;
        $rootScope.pageTitle    = current.$$route.pageTitle;
        $rootScope.appLoading   = false;
        $rootScope.loading      = false;
    });
    $rootScope.$on('$routeChangeError', function (event, current, previous, rejection) {
        $rootScope.loading = true; //hide loading
    });

     // refresh
    $rootScope.refresh = function() {
        $route.reload();
    };
}]);

/**!
 * Service      : httpApi
 * Description  : This helper is used to send and retrieve data from server.
 *                It holds one method called "request" which need one "config" parameter.  
 *                config parameter holds all the configuration for ajax request.
 *                There is some defautl configuration. The default configuration is replaced with parameter.
 *                It also generate some toastr notification based ajax response. 
 * @params      : {config}  Ajax Request Configuration
 * @return      : Ajax Resposne
 */
moduleApp.factory('httpApi', ['$rootScope', '$http', '$location', 'toastr', function($rootScope, $http, $location, toastr) {
    return {
        request: function(config) {
            config = angular.extend({method: 'GET', responseType: 'json', errorContainer: 'errorList'}, config);

            return $http(config).then(function(response) {
                // HTTP request success callback
                var data = response.data;

                if(angular.isDefined(data.error)) {
                    var error = angular.extend({title: 'Invalid Data', message: 'Please review your data & try again'}, data.error); 
                    toastr.error(error.message, error.title);   
                    throw new Error("Server return error response.");
                }

                if(angular.isDefined(data.success)) {
                    var success = angular.extend({title: 'Success', message: 'Data successfully saved'}, data.success); 
                    toastr.success(success.message, success.title, {
                        maxOpened: 0,
                        timeOut: 1000,
                    });
                }

                if(angular.isDefined(data.info)) {
                    var info = angular.extend({title: 'Information', message: 'Data successfully saved'}, data.info); 
                    toastr.info(info.message, info.title);
                }

                if(angular.isDefined(data.warning)) {
                    var warning = angular.extend({title: 'Warning', message: 'Please review your data'}, data.warning); 
                    toastr.warning(warning.message, warning.title);
                }
                
                $rootScope[config.errorContainer] = {};

                return response;
            });
        }
    }
}]);

/**!
 * Directive    : fileUpload
 * Description  : fileUpload is used to upload image/files to server. It sends ajax request to server to upload files. 
 * Restriction  : Works for HTML Element & Attribute 
 * How to use   : <file-upload accept="'image/*'" path="'files'" model="uploadData"></file-upload>
 *                <div file-upload accept="'image/*'" path="'files'" model="uploadData"></div>
 * @attribute   : {accept}  what kind of file can be uploaded
 * @attribute   : {path}    server path to upload files
 * @attribute   : {model}   ng-model to store name of uploaded file
 */
moduleApp.directive('fileUpload', ['$timeout', 'Upload', 'httpApi', function($timeout, Upload, httpApi) {
    return {
        restrict: 'EA',
        scope: {
          model: '=',
          path: '=',
          accept: '=?',
          preview: '=?',
        },
        template: function() {
            var html = '<label class="ace-file-input no-margin show" ng-model="file" ngf-select="uploadFiles($file, $invalidFiles)" accept="{{ accept }}" ngf-pattern="\'{{ accept }}\'" ng-disabled="model"><span class="ace-file-input"><span class="ace-file-container" ng-class="{\'selected\':model}" data-title="{{ button }}"><span class="ace-file-name" data-title="{{ fileName }}"><i class=" ace-icon fa fa-upload"></i></span></span></span> <a class="remove" ng-click="removeFiles()" ng-class="{\'show\': model}"><i class=" ace-icon fa fa-times"></i></a></label>';

            /*html += '<img ngf-thumbnail="file" ngf-size="{width: 120, height: 120, quality: 0.9}" ng-if="file && preview" />';*/
            html += '<div class="attachmentbody" ng-if="preview" ng-if="progress == 100"><ul class="success"><li>';
            html += '<img ng-src="{{filePath}}" width="120" height="120" ng-if="fileExt == \'jpg\' || fileExt == \'png\' || fileExt == \'gif\' || fileExt == \'jpeg\'"/>';
            html += '<i class="fa fa-file-text-o bigger-300 text-center" ng-if="fileExt == \'txt\'"></i>';
            html += '<i class="fa fa-file-word-o bigger-300 text-center" ng-if="fileExt == \'doc\' || fileExt == \'docx\'"></i>';
            html += '<i class="fa fa-file-excel-o bigger-300 text-center" ng-if="fileExt == \'xls\' || fileExt == \'xlxs\'"></i>';
            html += '<i class="fa fa-file-pdf-o bigger-300 text-center" ng-if="fileExt == \'pdf\'"></i>';
            html += '<i class="fa fa-file-archive-o bigger-300 text-center" ng-if="fileExt == \'zip\'"></i>';
            html += '<div class="progress" ng-if="progress < 100"><div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width: {{progress}}%;">{{progress}}%</div></div>';
             html += '<p class="text-danger">{{ errorMsg }}</p>';
            html += '</li></ul></div>';

            return html;
        },  
        link: function(scope, element, attrs) {
            if(!angular.isDefined(scope.preview)) scope.preview = true;
            if(!angular.isDefined(scope.accept)) scope.accept = 'image/*,.pdf,.doc,.docx';

            scope.button = "Choose";
            scope.fileName = "No File ...";

            scope.$watch('model', function() {
                if(angular.isDefined(scope.model) && scope.model != '') {
                    scope.filePath  = APPURL.get('/'+scope.path+'/'+scope.model);
                    scope.fileName  = scope.model;
                    scope.fileExt   = scope.model.split(".")[1];
                    scope.button    = "Remove";
                } else {
                    scope.button    = "Choose";
                    scope.fileName  = "No File ...";
                    scope.fileExt   = '';
                }
            });            

            scope.uploadFiles = function(file, errFiles) { 
                if (file) {
                    scope.errorMsg = '';
                    scope.progress = 0;

                    file.upload = Upload.upload({
                        url: APPURL.get('/file/upload'),
                        data: {file: file, filePath: scope.path}
                    });

                    file.upload.then(function (response) {
                        $timeout(function () {
                            file.result     = response.data;
                            if(file.result.status) {
                                scope.model     = response.data.fileName;
                                scope.button    = "Remove";

                                scope.fileName  = response.data.fileName;
                                scope.fileExt   = response.data.fileExt;
                                scope.filePath  = APPURL.get('/'+scope.path+'/'+scope.model);
                            } else {
                                scope.errorMsg = file.result.message;
                            }                                 
                        });
                    }, function (response) {
                        if (response.status > 0)
                            scope.errorMsg = response.status + ': ' + response.data;
                    }, function (evt) {
                        scope.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                    });
                }
            };

            scope.removeFiles = function() {
                if(angular.isDefined(scope.path) && scope.path != '' && angular.isDefined(scope.fileName) && scope.fileName != ''){
                    httpApi.request({
                        url: APPURL.get('/file/remove'),
                        method: "post",
                        data: {filePath: scope.path, fileName: scope.fileName},
                    }).then(function(response) {
                        scope.button = "Choose";
                        scope.fileName = "No File ...";
                        scope.file = '';
                        scope.model = '';
                        scope.fileExt = '';
                        scope.progress = 100;
                    });
                }
            };
        }
    };
}]);

/**!
 * Directive    : select2
 * Description  : select2 generates filterable dropdown list.
 * Restriction  : Works for HTML Attribute and Class 
 * How to use?  : <select select2></select>
 *                or <select class="select2"></select>    
 * @attribute   : Not Available      
 */
moduleApp.directive('select2', ['$timeout', function($timeout) {
    return {
        restrict: 'AC',
        link: function(scope, element, attrs) {
            $timeout(function(){
                angular.element(element).select2();
                element.select2Initialized = true;
            });

            scope.$watch(attrs.ngModel, function() {
                if (!element.select2Initialized) return;
                $timeout(function(){
                    angular.element(element).trigger('change.select2');
                }); 
            });
        }
    };
}]);

/**
 * Directive    : ErrorMessage
 * Description  : Any kind of error list can be shown with this
 * Restriction  : Works for HTML Attribute and Element 
 * How to use?  : <error-message error-list="errorListContainer"></error-message> 
 *                or <div error-message error-list="errorListContainer"></div>
 * @attribute   : {error-list} An on dimensional array of error message.                     
 */ 
moduleApp.directive('errorMessage', function() {
    return {
        restrict: 'EA',
        scope: {
          errorList: '=',
        },
        template: '<div class="alert alert-danger" ng-if="errorList.length"><ul><li ng-repeat="x in errorList">{{ x }}</li></ul></div>',
    };
});

/**
 * MainController
 * Description  : All the basic task of crud app will be executed from this controller    
 */

moduleApp.controller('MainController', ['$rootScope', '$scope', '$location', '$route', '$routeParams', '$timeout', '$filter', '$uibModal', '$ngConfirm', 'toastr', 'ValidationService', 'httpApi', function($rootScope, $scope, $location, $route, $routeParams, $timeout, $filter, $uibModal, $ngConfirm, toastr, ValidationService, httpApi) {

    // set tinymce option globally
    $scope.tinymceOptions = {
        height: 300,
        theme: 'modern',
        plugins: [
            'advlist autolink lists link image charmap print preview hr anchor pagebreak',
            'searchreplace wordcount visualblocks visualchars code fullscreen',
            'insertdatetime media nonbreaking save table contextmenu directionality',
            'emoticons template paste textcolor colorpicker textpattern imagetools codesample toc help'
        ],
        toolbar1: 'undo redo | insert | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
        toolbar2: 'print preview media | forecolor backcolor emoticons | codesample help',
        image_advtab: true,
        templates: [
            { title: 'Test template 1', content: 'Test 1' },
            { title: 'Test template 2', content: 'Test 2' }
        ],
        content_css: [
            '//fonts.googleapis.com/css?family=Lato:300,300i,400,400i',
            '//www.tinymce.com/css/codepen.min.css'
        ]
    };
    
    /**
     * List Page Releted Functions
     */

    $scope.paginateScope = 'paginateData';
    $scope.routeParams   = $routeParams;

    // generate list
    $scope.getData = function(dataUrl, where) {

        $rootScope.loading = true; // hide pre loading
        // prepare data url
        if(!angular.isDefined(dataUrl) || dataUrl == '') {
            dataUrl = $route.current.$$route.dataUrl;
        }

        dataUrl = $scope.decorateUrl(dataUrl);

        // merger query string with where
        var data = angular.extend({}, $location.search(), where);

        if(angular.isDefined(dataUrl) && dataUrl != '') {
            httpApi.request({
                url: APPURL.get(dataUrl),
                params: data,
            }).then(function(response) {
                // append master data to scope
                if(response.status == 200) {                    
                    angular.extend($scope, response.data);
                    $rootScope.loading = false; // hide pre loading                    
                }
            });
        } else {
            $rootScope.loading = false; // hide pre loading
        }             
    };

    // page changed
    $scope.pageChanged = function() {
        $scope[$scope.paginateScope].current_page;
        $location.search('page', $scope[$scope.paginateScope].current_page);
        $scope.getData();
    };
    // filter
    $scope.filterChanged = function(key, value) {
        if( !angular.isDefined(key) ) throw new Error("1st Params @ key is not defined");
        if( !angular.isDefined(value) ) throw new Error("2nd Params @ value is not defined");

        $scope[$scope.paginateScope][key] = value;
        $location.search(key, value);
        $scope.getData();
    };
    // search
    $scope.searchChanged = function() {
        $location.search('keyword', $scope[$scope.paginateScope].keyword);
        $scope.getData();
    };
    // sorting
    $scope.sortingChanged = function(column) {
        if( !angular.isDefined(column) ) throw new Error("1st Params @ sorting column is not defined");

        if($scope[$scope.paginateScope].sort != column) {
            var order = 'asc';
        } else {
            if($scope[$scope.paginateScope].order == 'asc') {
                var order = 'desc';
            } else {
                var order = 'asc';
            }
        }

        $scope[$scope.paginateScope].sort = column;
        $scope[$scope.paginateScope].order = order;

        $location.search('sort', column);
        $location.search('order', order);
        $scope.getData();
    };
    // set sorting class
    $scope.getSortingClass = function(column) {
        if(angular.isDefined($scope[$scope.paginateScope]) && angular.isDefined($scope[$scope.paginateScope].sort)) {
            if($scope[$scope.paginateScope].sort == column) {
                if($scope[$scope.paginateScope].order == 'asc') {
                    return 'sorting_asc';
                } else {
                    return 'sorting_desc';
                }
            }
        }            
    };
    // page changed
    $scope.resetUrl = function() {
        $location.search({});
        $scope.getData();
    };
    // delete data
    $scope.deleteData = function (dataUrl, callback) {
        if( !angular.isDefined(dataUrl) ) throw new Error("1st Params @ dataUrl is not defined");
        if( angular.isDefined(callback) && !angular.isArray(callback) && !angular.isFunction(callback) ) throw new Error("2nd Params @ callback must be either a function or array");

        $ngConfirm({
            icon: 'fa fa-warning',
            title: 'Delete Parmanently',
            content: 'Are you sure delete this item?',
            closeIcon: true,
            buttons: {
                Delete: {
                    text: 'Delete',
                    btnClass: 'btn-danger',
                    action: function(scope, button) {
                        
                        httpApi.request({ url: APPURL.get(dataUrl) }).then(function(response) {
                            if(response.status == 200) {                                
                                if(angular.isArray(callback)) {
                                    callback[0].apply(this, callback.slice(1));
                                } else if(angular.isFunction(callback)) {
                                    callback();
                                } else {
                                    $route.reload();
                                }
                            }
                        });
                    }
                },
                close: function(scope, button){
                    // closes the modal
                },
            }
        });
    };
    // show popup / modal
    $scope.showModal = function(templateUrl, dataUrl) {
        if( !angular.isDefined(templateUrl) ) throw new Error("1st Params @ templateUrl is not defined");

        $uibModal.open({
            controller: 'ModalController',
            templateUrl: APPURL.get(templateUrl),
            scope: $scope,
            backdrop: 'static',
            resolve: {
                dataUrl: function() {
                    return dataUrl;
                }
            }
        });
    };

    /**
     * Form Releted Functions
     */

    // remove error from one single element
    $scope.removeInputValidator = function ( form, elmName ) {
        if( !angular.isDefined(form) ) throw new Error("1st Params @ formName is not defined");
        if( !angular.isDefined(elmName) ) throw new Error("2nd Params @ elmentName is not defined");

        new ValidationService().removeValidator($scope.itemForm, elmName);
    }
    // reset form
    $scope.resetForm = function(form, data) { 
        if( !angular.isDefined(form) ) throw new Error("1st Params @ formName is not defined");

        new ValidationService().resetForm(form);
        angular.copy({}, data);
    }
    // submit form
    $scope.submitForm = function(action, form, data, callback, errorContainer) {
        // params validator
        if( !angular.isDefined(action) ) throw new Error("1st Params @ action is not defined");
        if( !angular.isDefined(form) ) throw new Error("2nd Params @ form Name is not defined");
        if( angular.isDefined(callback) && !angular.isArray(callback) && !angular.isFunction(callback) ) throw new Error("4th Params @ callback is not a function or array");
        if( angular.isDefined(errorContainer) && !angular.isString(errorContainer) ) throw new Error("5th Params @ callback is not a function or array");
        if(!angular.isDefined(errorContainer)) errorContainer = 'errorList';

        // main function
        if(new ValidationService().checkFormValidity(form)) {
            httpApi.request({
                url: APPURL.get(action),
                method: "POST",
                data: data,
                errorContainer: errorContainer,
            }).then(function(response) {
                if(response.status == 200) {
                    if(angular.isDefined(response.data.redirect)) {
                        $scope.redirect(response.data.redirect);
                    } else {
                        $scope.resetForm(form, data);
                        if(angular.isArray(callback)) {
                            callback[0].apply(this, callback.slice(1));
                        } else if(angular.isFunction(callback)) {
                            callback();
                        }
                    }
                }
            });
        }
    }

    /**
     * Add Row / Grid Releted Functions
     */

    // validate grid input and add data to grid
    $scope.gridAdd = function(form, list, input) {
        if( !angular.isDefined(form) ) throw new Error("1st Params @ grid form name is not defined");
        if( !angular.isDefined(list) ) throw new Error("2nd Params @ grid list is not defined");
        if( !angular.isDefined(input) ) throw new Error("3rd Params @ grid input is not defined");

        if(new ValidationService().checkFormValidity(form)) {
            if(angular.isDefined(input.index)) {
                angular.copy(input, list[input.index]);
            } else {
                list.push(angular.copy(input));
            }        
            angular.copy({}, input);
        }
    }
    // edit grid data
    $scope.gridEdit = function(list, input, data) {
        if( !angular.isDefined(list) ) throw new Error("1st Params @ grid list is not defined");
        if( !angular.isDefined(input) ) throw new Error("2nd Params @ grid input is not defined");
        if( !angular.isDefined(data) ) throw new Error("3rd Params @ grid single row / data is not defined");

        angular.copy(data, input);
        input.index = list.indexOf(data);        
    }
    // reset grid form
    $scope.gridReset = function(form, input) {
        if( !angular.isDefined(form) ) throw new Error("1st Params @ grid form name is not defined");
        if( !angular.isDefined(input) ) throw new Error("2nd Params @ grid input is not defined");

        new ValidationService().resetForm(form);
        angular.copy({}, input);
    }
    // remove from grid list
    $scope.gridRemove = function(list, data) {
        if( !angular.isDefined(list) ) throw new Error("1st Params @ grid list is not defined");
        if( !angular.isDefined(data) ) throw new Error("2nd Params @ grid single row / data is not defined");

        var index = list.indexOf(data);   
        list.splice(index,1);
    }

    /**
     * This function find the selected object in select box
     * This function works for select which has ng-repeat
     */
    $scope.getSelectedObject = function(list, condition, container) {
        if( !angular.isDefined(list) ) throw new Error("1st Params @ array list is not defined");
        if( !angular.isDefined(condition) ) throw new Error("2nd Params @ condition is not defined");
        if( !angular.isDefined(container) ) throw new Error("3rd Params @ response container is not defined");

        $scope[container] = $filter('filter')(list, condition)[0];
    }
    $scope.decorateUrl = function(dataUrl) {
        angular.forEach($routeParams, function(v, k){
            dataUrl = dataUrl.replace(':'+k, v);
        });

        return dataUrl;
    }
    $scope.redirect = function(url) {
       $location.url(url);
    }

    /**
     * PDF Releted Functions
     */
    $scope.html2json = function(childrenList, domTree) {

        angular.forEach(childrenList, function(node, key) {
            var element = angular.element(node);
            if(!element.hasClass('do-not-print')) {
                
                /*if(node.tagName == 'DIV' && element.is('[class^="col-"]')) {
                    if(angular.isArray(domTree['columns'])) {
                        var newData = $scope.html2json(element.children(), []);
                        domTree['columns'] = domTree['columns'].concat(newData);    
                    } else {
                       domTree['columns'] = $scope.html2json(element.children(), []);
                       domTree['columnGap'] = 10; //set every column with same side
                    }
                } else */
                if(node.tagName == 'TABLE') {
                    // push table object
                    domTree.push({ 
                        table: $scope.html2json(element.children(), {}),
                        alignment: 'center',
                        style: 'TABLE',
                    });
                } else if( ["THEAD", "TBODY", "TFOOT"].indexOf(node.tagName) > -1) {
                    // append thead, tbody, tfoot as array
                    if(angular.isArray(domTree['body'])) {
                        var newData = $scope.html2json(element.children(), []);
                        domTree['body'] = domTree['body'].concat(newData);    
                    } else {
                        domTree['body'] = $scope.html2json(element.children(), []);
                        //domTree['widths'] = '*'; //set every column with same side
                    }
                } else if(node.tagName == 'TR') {
                    // push tr as array
                    domTree.push( $scope.html2json(element.children(), []) );
                } else if(node.tagName == 'TD' || node.tagName == 'TH') {
                    // find colspan
                    var colspan = parseInt(element.attr('colspan'));
                    // find children
                    if(element.children().length > 0) {
                        // find children of td / th
                        domTree.push({ 
                            text: $scope.html2json(element.children(), []), 
                            colSpan: colspan, 
                            alignment: 'center', 
                        });
                    } else {
                        // push column data as object
                        domTree.push({ 
                            text: element.text(), 
                            colSpan: colspan, 
                            style: 'default' 
                        });
                    }
                    // add empty column for colspan
                    for (var i = 1; i < colspan; i++) {
                        domTree.push('');
                    }
                } else if( ["H1", "H2", "H3", "H4", "H5", "H6", "P"].indexOf(node.tagName) > -1) {
                    domTree.push({ 
                        text: element.text()+'\n', 
                        style: node.tagName 
                    });
                } else {
                    if(element.children().length > 0) {
                        // reinitiate loop if children found
                        domTree.push( $scope.html2json(element.children(), []) );
                    }
                }
            }                
        });

        return domTree;
    }

    
    var pdfCss = {
        TABLE: { margin: [0, 0, 0, 10] },  // left, top, right, bottom
        H1: { fontSize: 18, bold: true },
        H2: { fontSize: 16, bold: true },
        H3: { fontSize: 14, bold: true },
        H4: { fontSize: 12, bold: true },
        H5: { fontSize: 10, bold: true },
        H6: { fontSize: 8, bold: true },
        P: { fontSize: 7 },
        default: { fontSize: 8 }
    }
    $scope.openPdf = function(element) {
        var docDefinition = { content: $scope.html2json(angular.element(element).children(), []), styles: pdfCss, };
        pdfMake.createPdf(docDefinition).open();
    }
    $scope.downloadPdf = function(element) {
        var docDefinition = { content: $scope.html2json(angular.element(element).children(), []), styles: pdfCss };
        pdfMake.createPdf(docDefinition).download();
    }
    $scope.getBaseUrl = function(action) {
        return APPURL.get(action);
    }
}]);


moduleApp.controller('ModalController', ['$scope', '$uibModalInstance', 'httpApi', 'dataUrl', function($scope, $uibModalInstance, httpApi, dataUrl) {

    if(angular.isDefined(dataUrl) && dataUrl != '') {
        httpApi.request({ url: APPURL.get(dataUrl) }).then(function(response) {
            // append master data to scope
            angular.extend($scope, response.data);
        });
    }

    $scope.dismissModal = function() {
        $uibModalInstance.close();
    };
}]);


/*moduleApp.controller('CtrlImplAdvanced', ['$scope', '$controller', function ($scope, $controller) {
    // Initialize the super class and extend it.
    angular.extend(this, $controller('MainController', {$scope: $scope}));

    console.log('Controller Extension Successfull');
}]);*/
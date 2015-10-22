// Dependencies - d-trap-scroll attribute directive is used to hide scrollbars and focus scroll

//import angular from 'angular';
//import _ from 'lodash';

import './styles.css!';

// initial help template to load
const helpStart = 'index.md';

/**
 *  Help Service
 * @param $http
 * @param $sce
 */
const service = ($http, $sce) => ({
  // open/close panel
  showPanel: false,
  // will be set based on content title
  panelTitle: 'Help',
  // show/hide search
  showSearch: true,
  showResults: false,
  contentHTML: '',
  searchResults: [],
  // language - this could be done via provider on help service
  language: 'en',
  api: '/api',
  query: '',
  // simple state tracking for back button
  navStack: [],
  currentPage: {type: 'page', data: helpStart},


  setCurrentPage(page) {
    console.log('add', this.navStack, page);
    this.navStack.push(this.currentPage);
    this.currentPage = page;
  },


  getBack(){
    return this.navStack.pop();
  },


  showBack(){
    return !!this.currentPage.data;
  },


  getContent(link) {

    if (!link || link === helpStart){
      link = helpStart;
      this.searchResults.length = 0;
      this.navStack.length = 0;
      this.currentPage = '';
    }

    $http.get(this.api + '/help/' + this.language + '/' + link).then((result) => {
      this.showSearch = link === helpStart;
      this.showResults = false;
      this.contentHTML = $sce.trustAsHtml(result.data);
    }, (error) => {
      // display content error message
      console.log(error);
    });
  },


  getSearch(criteria) {
    $http.post(this.api + '/help/search', {lang: this.language, criteria: criteria}).then((result) => {
      this.showResults = true;
      this.searchResults = result.data;
    }, (error) => {
      // display content error message
      console.log(error);
    });
  },


  closePanel($event) {
    this.navStack.length = 0;
    $event.stopImmediatePropagation();
    this.showPanel = false;
  },


  togglePanel() {
    this.showPanel = !this.showPanel;
  },


  contextualOpen(link) {
    this.searchResults.length = 0;
    this.showPanel = true;
    this.getContent(link);
  }
});



/**
 * Contextual help display
 * @param HelpService
 */
const context = (HelpService) => ({
  restrict: 'A',
  scope: {
    dHelpDisplay: '@dHelpDisplay'
  },
  link: (scope, elem) => {

    elem.on('click', (event) => {
      event.stopImmediatePropagation();
      HelpService.contextualOpen(scope.dHelpDisplay);
    });

    // clean up
    scope.$on('$destroy', () => {
      elem.unbind('click');
    });
  }
});



/**
 * dHelpToggle help panel attribute directive
 * @param HelpService
 */
const toggle = (HelpService) => ({
  restrict: 'A',
  scope: false,
  link: (scope, elem) => {

    elem.on('click', (event) => {
      event.stopImmediatePropagation();
      scope.$applyAsync(() => {
        HelpService.togglePanel();
      })
    });

    // clean up
    scope.$on('$destroy', () => {
      elem.unbind('click');
    });
  }
});


// used to name directive and directive CSS class name (myDirectiveName and CSS class .my-directive-name)
const componentName = 'dHelp';

/**
 * dHelp directive
 * @param HelpService
 */
const panel = (HelpService) => ({
  controllerAs: 'ctrl',
  controller: () => ({
    // search text input binding
    searchString: '',
    // help content markup
    HelpService,


    // display search results
    backHandler($event) {
      $event.stopImmediatePropagation();
      let back = HelpService.getBack();
      if (back) {
        console.log(HelpService.navStack);
        console.log('back', back.data);
        if (back.type === 'search'){
          HelpService.showSearch = true;
          HelpService.showResults = true;
          HelpService.getSearch(back.data); // criteria
        } else {
          HelpService.getContent(back.data);
        }
      } else {
        HelpService.getContent(helpStart);
      }
    },


    // don't toggle menu with demo menu item clicks
    contentClickHandler($event) {
      $event.stopImmediatePropagation();
      let helpLink = $event.target.dataset.link;
      if (helpLink) {
        HelpService.setCurrentPage({type: 'page', data: helpLink});
        HelpService.getContent(helpLink);
      }
      return false;
    },


    // search action
    searchAction($event) {
      $event.stopImmediatePropagation();
      HelpService.setCurrentPage({type: 'search', data: this.searchString});
      HelpService.getSearch(this.searchString);
    },

    // load initial help page via linkFn - this could be done by help module run method calling service
    init() {
      // reset search
      this.searchString = '';
      // could config language on service
      HelpService.language = this.lang;
      HelpService.api = this.api;
      HelpService.navStack.length = 0;
      // we could use different approaches to load initial content
      HelpService.getContent(helpStart);
    }

  }),
  bindToController: {
    lang: '=lang',
    api: '=api'
  },
  scope: {},
  link(scope, elem, attrs, ctrl) {
    // add component specific class-name to component element
    elem.addClass(_.kebabCase(componentName));
    ctrl.init();
  },
  template: `
     <div class="help-wrapper" ng-if="ctrl.HelpService.showPanel">
         <header>
           <ul>
             <li><h2><a ng-click="ctrl.init()" aria-label="Help Index">{{ctrl.HelpService.panelTitle}}</a></h2></li>
             <li ng-show="ctrl.HelpService.showBack()">
              <a class="back" ng-click="ctrl.backHandler($event)" aria-label="Back to previous page"></a>
             </li>
             <li><a class="close" ng-click="ctrl.HelpService.closePanel($event)" aria-label="Close Help"></a></li>
           </ul>
         </header>
         <help-content d-trap-scroll>
            <section role="search" ng-if="ctrl.HelpService.showSearch">
                <input type="search" ng-model="ctrl.searchString" />
                <button type="button" ng-click="ctrl.searchAction($event)" ng-disabled="!ctrl.searchString">Search</button>
            </section>
            <main ng-click="ctrl.contentClickHandler($event)" ng-switch="ctrl.HelpService.showResults">
              <div ng-switch-when="false" ng-bind-html="ctrl.HelpService.contentHTML"></div>
              <div ng-switch-when="true" class="help-content item-list">
              <ul ng-switch="!!ctrl.HelpService.searchResults.length">
                <li ng-switch-when="true" ng-repeat="result in ctrl.HelpService.searchResults">
                  <a data-link="{{result.id}}">{{result.title}}</a>
                </li>
                <li ng-switch-when="false">No results</li>
              </ul>
              </div>
            </main>
         </help-content>
     </div>`
});


// keep this as independent module
export default angular.module('app.component.help', [])
  .service('HelpService', ['$http', '$sce', service])
  .directive('dHelpDisplay', ['HelpService', context])
  .directive('dHelpToggle', ['HelpService', toggle])
  .directive(componentName, ['HelpService', panel])
  .name;

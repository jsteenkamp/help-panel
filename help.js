import angular from 'angular';

import './styles.css!';

// initial help template to load
const helpStart = 'index.md';

/**
 *  Help Service
 * @param $http
 * @param config
 * @param $sce
 */
const service = ($http, $sce) => ({
  // open/close panel
  showPanel: false,
  // will be set based on content title
  panelTitle: 'Help',
  // show/hide search
  showSearch: true,
  showBack: false,
  showResults: false,
  contentHTML: '',
  searchResults: [],
  // language - this could be done via provider on help service
  language: 'en',
  api: '/api',
  query: '',

  getContent(link) {

    if (!link){
      link = helpStart;
      this.searchResults.length = 0;
    }

    $http.get(this.api + '/help/' + this.language + '/' + link).then((result) => {
      this.showSearch = link === helpStart;
      this.showBack = !!this.searchResults.length;
      this.showResults = false;
      this.contentHTML = $sce.trustAsHtml(result.data);
    }, (error) => {
      // display content error message
      console.log(error);
    });
  },

  getSearch(criteria) {
    this.showBack = false;
    $http.post(this.api + '/help/search', {lang: this.language, criteria: criteria}).then((result) => {
      this.showResults = true;
      this.searchResults = result.data;
    }, (error) => {
      // display content error message
      console.log(error);
    });
  },

  closePanel($event) {
    $event.stopImmediatePropagation();
    this.showPanel = false;
  },

  togglePanel() {
    this.showPanel = !this.showPanel;
  },

  contextualOpen(link) {
    let helpLink = link + '.md';
    this.showPanel = true;
    this.getContent(helpLink);
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
      HelpService.showSearch = true;
      HelpService.showResults = true;
    },


    // don't toggle menu with demo menu item clicks
    contentClickHandler($event) {
      $event.stopImmediatePropagation();
      let helpLink = $event.target.dataset.link;
      if (helpLink) {
        HelpService.getContent(helpLink);
      }
      return false;
    },


    // search action
    searchAction($event) {
      $event.stopImmediatePropagation();
      HelpService.getSearch(this.searchString);
    },

    // load initial help page via linkFn - this could be done by help module run method calling service
    init() {
      // reset search
      this.searchString = '';
      // could config language on service
      HelpService.language = this.lang;
      HelpService.api = this.api;
      // we could use different approaches to load initial content
      HelpService.getContent();
    }

  }),
  bindToController: {
    lang: '=lang',
    api: '=api'
  },
  scope: {},
  link(scope, elem, attrs, ctrl) {
    ctrl.init();
  },
  template: `
     <panel-wrapper ng-if="ctrl.HelpService.showPanel">
         <header>
           <ul>
             <li><h2><a ng-click="ctrl.init()" aria-label="Help Index">{{ctrl.HelpService.panelTitle}}</a></h2></li>
             <li ng-if="ctrl.HelpService.showBack"><a class="back" ng-click="ctrl.backHandler($event)" aria-label="Search results"></a></li>
             <li><a class="close" ng-click="ctrl.HelpService.closePanel($event)" aria-label="Close Help"></a></li>
           </ul>
         </header>
         <panel-content d-trap-scroll>
            <section role="search" ng-if="ctrl.HelpService.showSearch">
                <input type="search" ng-model="ctrl.searchString" />
                <button type="button" ng-click="ctrl.searchAction($event)" ng-disabled="!ctrl.searchString">Search</button>
            </section>
            <main ng-click="ctrl.contentClickHandler($event)" ng-switch="ctrl.HelpService.showResults">
              <div ng-switch-when="false" ng-bind-html="ctrl.HelpService.contentHTML"></div>
              <ul>
                <li ng-switch-when="true" ng-repeat="result in ctrl.HelpService.searchResults"><a data-link="{{result.id}}">{{result.title}}</a></li>
              </ul>
            </main>
         </panel-content>
     </panel-wrapper>`
});



// keep this as independent module

export default angular.module('app.component.help', [])
  .service('HelpService', ['$http', '$sce', service])
  .directive('dHelpDisplay', ['HelpService', context])
  .directive('dHelpToggle', ['HelpService', toggle])
  .directive('dHelp', ['HelpService', panel])
  .name;

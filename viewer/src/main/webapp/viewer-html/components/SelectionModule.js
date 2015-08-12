/*
 * Copyright (C) 2012-2013 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * SelectionModule component
 * Creates a SelectionModule component to build a tree
 * @author <a href="mailto:geertplaisier@b3partners.nl">Geert Plaisier</a>
 */

Ext.define('select.TreeNode', {
    extend: 'Ext.data.TreeModel',
    fields: [
        {name: 'nodeid', type: 'string'},
        // {name: 'children', type: 'array'},
        {name: 'name', type: 'string'},
        {name: 'type',  type: 'string'},
        {name: 'status', type: 'string'},
        {name: 'class', type: 'string'},
        {name: 'parentid', type: 'string'},
        {name: 'isLeaf', type: 'boolean'},
        // Text is used by tree, mapped to name
        {name: 'text', type: 'string', mapping:'name'},
        // Added convert function to icon
        {name: 'icon', type: 'string', convert: function(fieldName, record) {
            var nodeType = record.get('type');
            if(nodeType === "category" || nodeType === "level" || nodeType === "cswresult") return contextPath + '/viewer-html/components/resources/images/selectionModule/folder.png';
            if(nodeType === "maplevel") return contextPath + '/viewer-html/components/resources/images/selectionModule/maplevel.png';
            if(nodeType === "layer" || nodeType === "appLayer") return contextPath + '/viewer-html/components/resources/images/selectionModule/map.png';
            if(nodeType === "service") return contextPath + '/viewer-html/components/resources/images/selectionModule/serviceok.png';    
        }},
        // leaf mapped to isLeaf
        {name: 'leaf', type: 'boolean', mapping: 'isLeaf'},
        {name: 'index', type: 'int'}
        // {name: 'checkedlayers', type: 'array'},
    ]
});

Ext.define ("viewer.components.SelectionModule",{
    extend: "viewer.components.Component",

    // component specific config
    moveRightIcon: '',
    moveLeftIcon: '',
    moveUpIcon: '',
    moveDownIcon: '',
    selectedContent : null,
    appLayers :  null,
    levels : null,
    services : null,
    addedLevels: [],
    addedLevelsCount: 0,
    addedLayers: [],
    addedLayersCount: 0,
    addedServices: [],
    addedServicesCount: 0,
    layerMergeServices: {},
    rootLevel: null,
    rendered: false,
    // keep track if we checked the first added layer
    firstChecked: false,
    treePanels: {
        applicationTree: {
            treePanel: null,
            treeStore: null,
            filteredNodes: [],
            hiddenNodes: []
        },
        registryTree: {
            treePanel: null,
            treeStore: null,
            filteredNodes: [],
            hiddenNodes: []
        },
        customServiceTree: {
            treePanel: null,
            treeStore: null,
            filteredNodes: [],
            hiddenNodes: []
        },
        selectionTree: {
            treePanel: null,
            treeStore: null,
            filteredNodes: [],
            hiddenNodes: []
        }
    },
    activeTree: null,
    userServices: [],
    config: {
        name: "Selection Module",
        title: "",
        titlebarIcon : "",
        tooltip : "",
        label: "",
        advancedValueConfigs:null,
        advancedFilter:null,
        defaultCswUrl:null,
        advancedLabel:null,
        advancedValue:null,
        alwaysMatch:null,
        alwaysShow:null,
        showWhenOnlyBackground:null,
        showBackgroundLevels:null,
        showCswUrl: null
    },
    constructor: function (conf) {
        //set defaults
        var minwidth = 600;
        if(conf.details.width < minwidth || !Ext.isDefined(conf.details.width)) conf.details.width = minwidth;
        if (Ext.isEmpty(conf.selectGroups)){
            conf.selectGroups = true;
        }if (Ext.isEmpty(conf.selectLayers)){
            conf.selectLayers = true;
        }if (Ext.isEmpty(conf.selectOwnServices)){
            conf.selectOwnServices = true;
        } if(Ext.isEmpty(conf.selectCsw)){
            conf.selectCsw = true;
        } if(Ext.isEmpty(conf.showWhenOnlyBackground)){
            conf.showWhenOnlyBackground = true;
        } if(Ext.isEmpty(conf.alwaysShow)){
            conf.alwaysShow = false;
        } if(Ext.isEmpty(conf.showBackgroundLevels)){
            conf.showBackgroundLevels = false;
        }
        // call constructor and init config
        viewer.components.SelectionModule.superclass.constructor.call(this, conf);
        this.initConfig(conf);
        this.renderButton();
        // if there is no selected content, show selection module
        var me = this;
        this.config.viewerController.addListener(viewer.viewercontroller.controller.Event.ON_COMPONENTS_FINISHED_LOADING,function(){
            if(this.config.viewerController.app.selectedContent.length == 0 ){
                me.openWindow();
            }else{
                if(this.config.showWhenOnlyBackground && this.selectedContentHasOnlyBackgroundLayers()){
                    me.openWindow();
                }
            }
        },this);
        return this;
    },
    renderButton: function() {
        var me = this;
        this.superclass.renderButton.call(this,{
            text: me.config.title,
            icon: me.config.titlebarIcon,
            tooltip: me.config.tooltip,
            label: me.config.label,
            handler: function() {
                me.openWindow();
            }
        });

    },
    openWindow: function() {
        var me = this;
        me.popup.show();
        if(!me.rendered) {
            // If the component is not rendered before (opened for the first time) init the component
            me.initComponent();
        } else {
            if(me.treePanels.registryTree.treePanel) {
                // Sometimes the tree is not loaded yet when the popup is closed,
                // causing the tree to stay empty when the popup is opened again.
                // To prevent this we reload the tree when no nodes are available
                var rootNode = me.treePanels.registryTree.treePanel.getRootNode();
                if(!rootNode || !rootNode.hasChildNodes()) {
                    // No rootnode or rootnode has no children, so empty tree
                    me.treePanels.registryTree.treeStore.load();
                }
            }
            // get data from viewer controller
            me.initViewerControllerData();
            me.loadSelectedLayers();
        }
        this.firstChecked = false;
    },
    // only executed once, when opening the selection module for the first time
    initComponent: function() {
        var me = this;
        // set icon urls
        me.moveRightIcon = contextPath + '/viewer-html/components/resources/images/selectionModule/move-right.gif';
        me.moveLeftIcon = contextPath + '/viewer-html/components/resources/images/selectionModule/move-left.gif';
        me.moveUpIcon = contextPath + '/viewer-html/components/resources/images/selectionModule/move-up.gif';
        me.moveDownIcon = contextPath + '/viewer-html/components/resources/images/selectionModule/move-down.gif';
        // get data from viewer controller
        me.initViewerControllerData();
        // init base interface
        me.initInterface();
        // init tree containers
        me.initTreeSelectionContainer();
        // init trees
        me.initTrees();
        // if application layers / levels can be added, init them
        if(me.config.selectGroups) {
            me.initApplicationLayers();
        }
        // load the selected content to the right container
        me.loadSelectedLayers();
        // Show active left panel (based on checked radio boxes / only option)
        me.showActiveLeftPanel();
        // apply a scroll fix
        me.resizeTrees();
        // add listeners to the popupwin to hide and show tree containers (which would otherwise remain visible)
        me.popup.popupWin.addListener('hide', me.hideTreeContainers);
        me.popup.popupWin.addListener('show', me.showTreeContainers);
        me.popup.popupWin.addListener("dragstart", me.hideTreeContainers);
        me.popup.popupWin.addListener("dragend", me.showTreeContainers);
        me.popup.popupWin.addListener("resize", me.resizeTrees, me);
        // set rendered to true so this function won't be called again
        me.rendered = true;
    },
    // helper function to check if selected content has only background layers
    selectedContentHasOnlyBackgroundLayers : function (){
        var sc = this.config.viewerController.app.selectedContent;
        for( var i = 0 ; i < sc.length ; i++){
            var item = sc[i];
            if(item.type == "level"){
                var level = this.config.viewerController.app.levels[item.id];
                if(!level.background){
                    return false;
                }
            }else{
                var layer = this.config.viewerController.app.appLayers[item.id];
                if(!layer.background){
                    return false;
                }
            }
        }
        return true;
    },
    // hide all trees (happens when closing or moving popup)
    hideTreeContainers: function() {
        var treeContainers = Ext.query('.selectionModuleTreeContainer');
        Ext.Array.each(treeContainers, function(treeContainer) {
            treeContainer.style.display = 'none';
        });
    },
    // show all trees (happens when opening or stop moving popup)
    showTreeContainers: function() {
        var treeContainers = Ext.query('.selectionModuleTreeContainer');
        Ext.Array.each(treeContainers, function(treeContainer) {
            treeContainer.style.display = 'block';
        });
    },

    getActiveTreePanels: function() {
        var me = this;
        var panels = [];
        if(me.treePanels.applicationTree.treePanel != null) {
            panels.push(me.treePanels.applicationTree.treePanel);
        }
        if(me.treePanels.registryTree.treePanel != null) {
            panels.push(me.treePanels.registryTree.treePanel);
        }
        if(me.treePanels.customServiceTree.treePanel != null) {
            panels.push(me.treePanels.customServiceTree.treePanel);
        }
        if(me.treePanels.selectionTree.treePanel != null) {
            panels.push(me.treePanels.selectionTree.treePanel);
        }
        return panels;
    },

    getActiveTreePanelIds: function() {
        var me = this;
        var panelIds = [];
        var activePanels = me.getActiveTreePanels();
        for(var i = 0; i < activePanels.length; i++) {
            panelIds.push(activePanels[i].id);
        }
        return panelIds;
    },

    /**
     * Show active left panel (initially).
     * When multiple options are avaiable, show first left panel
     * When only one option is available, show that option
     */
    showActiveLeftPanel: function() {
        var me = this,
            availableOptions = [];

        // First add all available options to array
        if(me.config.selectGroups) availableOptions.push({ id: 'radioApplication', checked: true });
        if(me.config.selectLayers) availableOptions.push({ id: 'radioRegistry', checked: true });
        if(me.config.selectOwnServices) availableOptions.push({ id: 'radioCustom', checked: true });
        if(me.config.selectCsw) availableOptions.push({ id: 'radioCSW', checked: true });

        // If there is only one option, show that option
        if(availableOptions.length === 1) {
            me.handleSourceChange(availableOptions[0].id, availableOptions[0].checked);
        } else {
            // iterate over radio buttons on top to activate the checked item
            var selectionModuleFormField = Ext.getCmp(this.name + 'selectionModuleFormFieldContainer');
            if(selectionModuleFormField) {
                selectionModuleFormField.items.each(function(item){
                    if(item.checked) me.handleSourceChange(item.id, item.checked);
                });
            }
        }
    },
    /**
     * Returns the type of the activeTree ([applicationTree, registeryTree, customServiceTree];
     * returns string The type of the active tree;
     */
    getActiveTreeType: function() {
        var panels= this.treePanels;
        for(var key in panels){
            if(!panels.hasOwnProperty(key)) {
                continue;
            }
            var p = panels[key];
            if(p.treePanel && p.treePanel.getId() === this.activeTree.getId()){
                return key;
            }
        }
        return null;
    },

    /**
     *  Apply fixes to the trees for ExtJS scrolling issues
     */
    resizeTrees: function() {
        var me = this;
        var activePanels = me.getActiveTreePanels();
        for(var i = 0; i < activePanels.length; i++) {
            activePanels[i].getView().panel.updateLayout();
        }
    },
    initViewerControllerData: function() {
        var me = this;
        // We make a cloned reference, so we can easily edit this array and merge it to the original after clicking 'Ok'
        me.selectedContent = Ext.clone(this.config.viewerController.app.selectedContent);
        me.appLayers = this.config.viewerController.app.appLayers;
        me.levels = this.config.viewerController.app.levels;
        me.services = this.config.viewerController.app.services;
        me.rootLevel = this.config.viewerController.app.rootLevel;
    },

    loadCustomService: function() {
        var me = this;
        me.popup.popupWin.setLoading("Zoeken...");

        var protocol = '', url = '', q = '';
        if(me.customServiceType == 'csw') {
            url = Ext.getCmp('cswServiceUrlTextfield').getValue();
            q = Ext.getCmp('cswSearchTextfield').getValue();
            var csw = Ext.create("viewer.CSWClient", {
                url: url,
                q: q
            });
            var advancedSearch = Ext.getCmp('advancedSearchQuery').getValue();
            if(this.config.advancedFilter && ( !Ext.getCmp("cswAdvancedSearchField").collapsed || this.config.alwaysMatch)){
                csw.config["actionbeanUrl"] = actionBeans["advancedcsw"];
                csw.config["advancedString"] = advancedSearch;
                csw.config["advancedProperty"] = this.config.advancedValue;
                csw.config["application"] = appId;
                csw.loadInfo(
                    function(response) {
                        var results = response.found;
                        var rootNode = me.treePanels.customServiceTree.treePanel.getRootNode();
                        me.clearTree(rootNode);
                        var foundIds = new Array();
                        for(var i = 0 ; i < results.length; i++){
                            var  result = results[i];
                            foundIds.push(result.id);
                        }

                        var levels = response.children;
                        var descriptions = response.descriptions;
                        var levelsToShow = new Array();
                        for(var i = 0 ; i < levels.length ; i ++){
                            var level = levels[i];
                            var l = me.addLevel(level.id, true, false, false, foundIds,descriptions);
                            if(l !== null){
                                l.expanded = true;
                                levelsToShow.push(l);
                            }
                        }
                        me.insertTreeNode(levelsToShow, rootNode);
                        me.popup.popupWin.setLoading(false);
                    },
                    function(msg) {
                        Ext.MessageBox.alert("Foutmelding", msg);
                        me.popup.popupWin.setLoading(false);
                    }
                );
            }else{

                csw.loadInfo(
                    function(results) {
                        me.populateCSWTree(results);
                        me.popup.popupWin.setLoading(false);
                    },
                    function(msg) {
                        Ext.MessageBox.alert("Foutmelding", msg);
                        me.popup.popupWin.setLoading(false);
                    }
                );
            }
        } else {
            protocol = Ext.getCmp('customServiceUrlSelect').getValue();
            url = Ext.getCmp('customServiceUrlTextfield').getValue();
            var si = Ext.create("viewer.ServiceInfo", {
                protocol: protocol,
                url: url
            });

            si.loadInfo(
                function(info) {
                    me.populateCustomServiceTree(info);
                    me.popup.popupWin.setLoading(false);
                },
                function(msg) {
                    Ext.MessageBox.alert("Foutmelding", msg);
                    me.popup.popupWin.setLoading(false);
                }
            );
        }
    },
    initInterface: function() {
        var me = this;
        var radioControls = [];
        // Add only if config option is set to true
        if(me.config.selectGroups) {
            radioControls.push({
                id: 'radioApplication',
                checked: true,
                name: 'layerSource',
                boxLabel: me.config.hasOwnProperty('labelGroups') ? me.config.labelGroups : 'Kaart',
                listeners: {change: function(field, newval) {me.handleSourceChange(field.id, newval)}}
            });
        }
        // Add only if config option is set to true, if this is the first that is added (so the previous was not added) set checked to true
        if(me.config.selectLayers) {
            radioControls.push({
                id: 'radioRegistry',
                checked: (radioControls.length === 0),
                name: 'layerSource',
                boxLabel: me.config.hasOwnProperty('labelLayers') ? me.config.labelLayers : 'Kaartlaag',
                listeners: {change: function(field, newval) {me.handleSourceChange(field.id, newval)}}
            });
        }
        // Add only if config option is set to true, if this is the first that is added (so the previous was not added) set checked to true
        if(me.config.selectOwnServices) {
            radioControls.push({
                id: 'radioCustom',
                name: 'layerSource',
                checked: (radioControls.length === 0),
                boxLabel: me.config.hasOwnProperty('labelOwnServices') ? me.config.labelOwnServices : 'Eigen service',
                listeners: {change: function(field, newval) {me.handleSourceChange(field.id, newval)}}
            });
        }
        if(me.config.selectCsw){
            radioControls.push({
                id: 'radioCSW',
                name:'layerSource',
                checked: (radioControls.length === 0),
                boxLabel: me.config.hasOwnProperty('labelCsw') ? me.config.labelCsw : 'CSW service',
                listeners: {change: function(field, newval) {me.handleSourceChange(field.id, newval)}}
            });
        }

        // If there is only 1 control, do not add any
        if(radioControls.length === 1) {
            radioControls = [];
        }

        // minimal interface, just tree container and save/cancel buttons
        var items = [{
            xtype: 'container',
            flex: 1,
            // width: '100%',
            // html: '<div id="treeSelectionContainer" style="width: 100%; height: 100%;"></div>',
            id: this.name + 'selectionModuleTreeContentContainer',
            layout: 'fit'
        },
        {
            // Form above the trees with radiobuttons and textfields
            xtype: 'form',
            layout: {
                type:'hbox'
            },
            items: [
                    {xtype:"label", text:"Tip: toevoegen kaarten kan ook door dubbelklikken.", margin: '3 0 0 0'},
                    {xtype:'tbfill'},
                    {xtype: 'button', text: 'Annuleren', handler: function() {
                        me.cancelSelection();
                    }},
                    {xtype: 'button', text: 'OK', style: {marginLeft: '10px'},handler: function() {
                        me.saveSelection();
                    }}
            ],
            // height: 35,
            padding: 5,
            border: 0,
            id: this.name + 'selectionModuleSaveFormContainer'
        }];
        // when there is one tree configured show radio buttons and form buttons above
        if(me.hasLeftTrees())
        {
            if(me.config.selectOwnServices || me.config.selectCsw) {
                if(!this.config.advancedValueConfigs){
                    this.config.advancedValueConfigs= new Array();
                }
                this.config.advancedValueConfigs.unshift({label: "", value: ""});
                var store = Ext.create('Ext.data.Store', {
                    fields: ['label', 'value'],
                    data : this.config.advancedValueConfigs
                });
                var combo = Ext.create('Ext.form.ComboBox', {
                    store:store,
                    queryMode: "local",
                    displayField: 'label',
                    id:"advancedSearchQuery",
                    valueField: 'value',
                    fieldLabel: this.config.advancedLabel !== null ? this.config.advancedLabel: ""
                });
                items.unshift({
                        // Form above the trees with radiobuttons and textfields
                        xtype: 'container',
                        height: 0,
                        padding: 5,
                        border: 0,
                        id: this.name + 'selectionModuleCustomFormContainer',
                        layout: 'auto',
                        items: [
                            {
                                xtype: 'panel',
                                id: 'customServicesTextfields',
                                border: false,
                                header: false,
                                layout: 'hbox',
                                defaults: {
                                    xtype: 'textfield',
                                    style: {
                                        marginRight: '5px'
                                    }
                                },
                                height: MobileManager.isMobile() ? 35 : 25,
                                width: '100%',
                                defaultType: 'textfield',
                                items: [
                                    {hidden: true, id: 'customServiceUrlTextfield', flex: 1, emptyText:'Voer een URL in'},
                                    {xtype: "combobox", store: [ ['wms','WMS'], ['arcims','ArcIMS'], ['arcgis','ArcGIS'] ], hidden: true, id: 'customServiceUrlSelect', width: 75, emptyText:'Maak uw keuze'},
                                    {xtype: 'button', text: 'Service ophalen', hidden: true, id: 'customServiceUrlButton', handler: function() {
                                            me.loadCustomService();
                                    }},
                                    {hidden: true, id: 'cswServiceUrlTextfield', flex: 1, emptyText:'Voer een URL in', value : this.config.defaultCswUrl !== undefined ? this.config.defaultCswUrl : "" },
                                    {hidden: true, id: 'cswSearchTextfield', flex: 1, emptyText:'Zoekterm', listeners: {
                                    specialkey: function(field, e){
                                        if (e.getKey() === e.ENTER) {
                                            me.loadCustomService();
                                        }
                                    }}},
                                    {xtype: 'button', text: 'Zoeken', hidden: true, id: 'cswServiceUrlButton', handler: function() {
                                            me.loadCustomService();
                                    }}
                                ]
                            },
                            {
                                xtype: 'panel',
                                id: 'cswAdvancedSearchField',
                                header: { 
                                    title: 'Geavanceerd zoeken'
                                },
                                collapsible: true,
                                collapsed: !this.config.alwaysShow,
                                height: MobileManager.isMobile() ? 85 : 65,
                                width: '100%',
                                bodyPadding: 5,
                                hidden: true,
                                items: [ combo ],
                                layout: 'fit',
                                listeners: {
                                    beforecollapse: function() {
                                        me.handleSourceChange('radioCSW', true);
                                    },
                                    beforeexpand: function() {
                                        me.handleSourceChange('radioCSW', true, MobileManager.isMobile() ? 140 : 120);
                                    }
                                }
                            }
                        ]
                    });
                }
                items.unshift({
                    // Form above the trees with radiobuttons and textfields
                    xtype: 'form',
                    items: [{
                        xtype: 'fieldcontainer',
                        id: this.name + 'selectionModuleFormFieldContainer',
                        layout: 'hbox',
                        border: 0,
                        defaults: {
                            xtype: 'radio',
                            style: {
                                marginRight: '5px'
                            }
                        },
                        defaultType: 'radio',
                        items: radioControls
                    }],
                    height: radioControls.length === 0 ? 0 : MobileManager.isMobile() ? 40 : 30,
                    padding: '0 5px 5px 5px',
                    border: 0,
                    id: this.name + 'selectionModuleFormContainer',
                    layout: 'fit'
            });
        }

        // Create main container
        Ext.create('Ext.container.Container', {
            id: this.name + 'selectionModuleMainContainer',
            width: '100%',
            height: '100%',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            style: {
                backgroundColor: 'White'
            },
            renderTo: me.popup.getContentId(),
            items: items
        });
    },

    initTreeSelectionContainer: function() {
        var me = this;
        // minimal tree interface (right tree with selected content and move up/down buttons)
        var items = [
                {
                    xtype: 'container',
                    flex: 1,
                    id: 'selectionTreeContainer',
                    layout: 'fit'
                },
                this.createMoveButtons({
                    iconTop: me.moveUpIcon,
                    iconBottom: me.moveDownIcon,
                    handlerTop: function() {
                        me.moveNodes('up');
                    },
                    handlerBottom: function() {
                        me.moveNodes('down');
                    }
                })
            ];
        // when there is one or more left trees configured, add left interface (left tree and move from/to tree buttons)
        if(me.hasLeftTrees())
        {
            items.unshift(
                {
                    xtype: 'container',
                    flex: 1,
                    html: '<div id="applicationTreeContainer" class="selectionModuleTreeContainer" style="position: absolute; width: 100%; height: 100%; visibility: visible;"></div>' +
                          '<div id="registryTreeContainer" class="selectionModuleTreeContainer" style="position: absolute; width: 100%; height: 100%; visibility: hidden;"></div>' +
                          '<div id="customTreeContainer" class="selectionModuleTreeContainer" style="position: absolute; width: 100%; height: 100%; visibility: hidden;"></div>'
                },
                this.createMoveButtons({
                    iconTop: me.moveRightIcon,
                    iconBottom: me.moveLeftIcon,
                    handlerTop: function() {
                        me.addNodes(me.activeTree.getSelectionModel().getSelection());
                    },
                    handlerBottom: function() {
                        me.removeNodes(me.treePanels.selectionTree.treePanel.getSelectionModel().getSelection());
                    }
                })
            );
        }
        var treeContainer = Ext.create('Ext.container.Container', {
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            width: '100%',
            height: '100%',
            id: this.name + 'selectionModuleTreesContainer',
            items: items
        });
        Ext.getCmp(this.name + 'selectionModuleTreeContentContainer').add(treeContainer);
    },

    createMoveButtons: function(config) {
        return {
            xtype: 'container',
            width: MobileManager.isMobile() ? undefined : 30,
            padding: MobileManager.isMobile() ? '0 2px' : undefined,
            layout: { type: 'vbox', align: 'center' },
            items: [
                { xtype: 'container', html: '<div></div>', flex: 1 },
                {
                    xtype: 'button',
                    icon: config.iconTop,
                    width: MobileManager.isMobile() ? undefined : 23,
                    height: MobileManager.isMobile() ? undefined : 22,
                    handler: config.handlerTop
                },
                {
                    xtype: 'button',
                    icon: config.iconBottom,
                    width: MobileManager.isMobile() ? undefined : 23,
                    height: MobileManager.isMobile() ? undefined : 22,
                    handler: config.handlerBottom
                },
                { xtype: 'container', html: '<div></div>', flex: 1 }
            ]
        };
    },

    initTrees: function() {
        var me = this;

        var defaultStoreConfig = {
            model: select.TreeNode,
            root: {
                text: 'Root',
                expanded: true,
                checked: false,
                children: []
            },
            proxy: {
                type: 'memory'
            }
        };

        var defaultTreeConfig = {
            xtype: 'treepanel',
            rootVisible: false,
            useArrows: true,
            height: "100%",
            scroll: "both",
            animate: false,
            selModel: {
                mode: 'MULTI'
            },
            listeners: {
                itemdblclick: function(view, record, item, index, event, eOpts) {
                    me.addNodes([ record ]);
                }
            }
        };

        if(me.config.selectGroups) {
            me.treePanels.applicationTree.treeStore = Ext.create('Ext.data.TreeStore', Ext.apply({}, defaultStoreConfig));
            var applicationTreeConfig = Ext.apply({}, defaultTreeConfig, {
                treePanelType: 'applicationTree',
                viewConfig: me.getViewConfig('collection'),
                store: me.treePanels.applicationTree.treeStore,
                renderTo: 'applicationTreeContainer'
            });
            if(!me.config.hasOwnProperty('showSearchGroups') || me.config.showSearchGroups) {
                applicationTreeConfig.tbar = [{xtype : 'textfield', id: 'applicationTreeSearchField',
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                me.filterNodes(me.treePanels.applicationTree.treePanel, Ext.getCmp('applicationTreeSearchField').getValue());
                            }
                        }
                    }},
                    {
                        xtype: 'button',
                        text: 'Zoeken',
                        handler: function() {
                            me.filterNodes(me.treePanels.applicationTree.treePanel, Ext.getCmp('applicationTreeSearchField').getValue());
                        }
                    }
                ];
            }
            me.treePanels.applicationTree.treePanel = Ext.create('Ext.tree.Panel', applicationTreeConfig);
        }

        if(me.config.selectLayers) {
            var serviceStore = Ext.create("Ext.data.TreeStore", {
                //autoLoad: true,
                proxy: {
                    type: 'ajax',
                    url: actionBeans["geoserviceregistry"]
                },
                defaultRootId: 'c0',
                defaultRootProperty: 'children',
                model: select.TreeNode,
                nodeParam: 'nodeId'
            });

            me.treePanels.registryTree.treeStore = serviceStore;
            var registryTreeConfig = Ext.apply({}, defaultTreeConfig, {
                treePanelType: 'registryTree',
                viewConfig: me.getViewConfig('collection'),
                store: me.treePanels.registryTree.treeStore,
                renderTo: 'registryTreeContainer'
            });
            if(!me.config.hasOwnProperty('showSearchLayers') || me.config.showSearchLayers) {
                registryTreeConfig.tbar = [{xtype : 'textfield', id: 'registryTreeSearchField',
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                me.filterRemote(me.treePanels.registryTree.treePanel, Ext.getCmp('registryTreeSearchField').getValue());
                            }
                        }
                    }},
                    {
                        xtype: 'button',
                        text: 'Zoeken',
                        handler: function() {
                            me.filterRemote(me.treePanels.registryTree.treePanel, Ext.getCmp('registryTreeSearchField').getValue());
                        }
                    }
                ];
            }
            me.treePanels.registryTree.treePanel = Ext.create('Ext.tree.Panel', registryTreeConfig);
        }

        if(me.config.selectOwnServices || me.config.selectCsw) {
            me.treePanels.customServiceTree.treeStore = Ext.create('Ext.data.TreeStore', Ext.apply({}, defaultStoreConfig));
            var customServiceConfig = Ext.apply({}, defaultTreeConfig, {
                treePanelType: 'customServiceTree',
                viewConfig: me.getViewConfig('collection'),
                store: me.treePanels.customServiceTree.treeStore,
                renderTo: 'customTreeContainer'
            });
            if(
                (!me.config.hasOwnProperty('showSearchOwnServices') || me.config.showSearchOwnServices) ||
                (!me.config.hasOwnProperty('showSearchCsw') || me.config.showSearchCsw)
            ) {
                customServiceConfig.tbar = [{xtype : 'textfield', id: 'customServiceTreeSearchField',
                    listeners: {
                        specialkey: function(field, e){
                            if (e.getKey() == e.ENTER) {
                                me.filterNodes(me.treePanels.customServiceTree.treePanel, Ext.getCmp('customServiceTreeSearchField').getValue());
                            }
                        }
                    }},
                    {
                        xtype: 'button',
                        text: 'Zoeken',
                        handler: function() {
                            me.filterNodes(me.treePanels.customServiceTree.treePanel, Ext.getCmp('customServiceTreeSearchField').getValue());
                        }
                    }
                ];
            }
            me.treePanels.customServiceTree.treePanel = Ext.create('Ext.tree.Panel', customServiceConfig);
        }

        me.treePanels.selectionTree.treeStore = Ext.create('Ext.data.TreeStore', Ext.apply({}, defaultStoreConfig));
        me.treePanels.selectionTree.treePanel = Ext.create('Ext.tree.Panel', Ext.apply({}, defaultTreeConfig, {
            treePanelType: 'selectionTree',
            store: me.treePanels.selectionTree.treeStore,
            viewConfig: me.getViewConfig('selection'),
            listeners: {
                itemdblclick: function(view, record, item, index, event, eOpts) {
                    me.removeNodes([ record ]);
                }
            },
            tbar: null
        }));
        Ext.getCmp('selectionTreeContainer').add(me.treePanels.selectionTree.treePanel);
    },
    
    getViewConfig: function(treeType) {
        var me = this;
        return {
            plugins: {
                ptype: 'treeviewdragdrop',
                appendOnly: true,
                allowContainerDrops: true,
                allowParentInserts: true,
                sortOnDrop: true,
                dropZone: {
                    // We always allow dragging over node
                    onNodeOver: function(node, dragZone, e, data) {
                        // If we find 1 allowed record we allow the drop (invalid ones will be filtered out)
                        if(me.nodesAddAllowed(data.records)) {
                            return Ext.dd.DropZone.prototype.dropAllowed;
                        }
                        return Ext.dd.DropZone.prototype.dropNotAllowed;
                    },
                    onContainerOver: function(dd, e, data) {
                        // If we find 1 allowed record we allow the drop (invalid ones will be filtered out)
                        if(me.nodesAddAllowed(data.records)) {
                            return Ext.dd.DropZone.prototype.dropAllowed;
                        }
                        return Ext.dd.DropZone.prototype.dropNotAllowed;
                    },
                    // On nodeDrop is executed when node is dropped on other node in tree
                    onNodeDrop: function(targetNode, dragZone, e, data) {
                        // We are in the selection tree && target and dragged node are both in same tree
                        if(treeType === 'selection' && targetNode.offsetParent === data.item.offsetParent) {
                            // Check where the element is dropped
                            var bounds = targetNode.getBoundingClientRect();
                            var dropY = e.getY();
                            // If dropped at the top 50% of the element, append above
                            // else append below
                            var halfWay = bounds.top + (bounds.height / 2);
                            me.moveNodesToPosition(data, dropY >= halfWay);
                            return true;
                        }
                        me.handleDrag(treeType, data);
                        return true;
                    }
                }
            },
            listeners: {
                // beforedrop is executed when node is dropped on container (so not on another node but on 'empty' space'
                beforedrop: function(node, data, overModel, dropPosition, dropHandlers, eOpts) {
                    // We cancel the drop (do not append the actual layers because we still need some validation)
                    dropHandlers.cancelDrop();
                    // Add/remove layers
                    me.handleDrag(treeType, data);
                }
            }  
        };
    },
    
    /**
     * Add/Remove layers after drag
     */
    handleDrag: function(treeType, data) {
        if(treeType === 'collection') {
            // Manually remove all layers which we dragged to other tree
            this.removeNodes(data.records);
        }
        if(treeType === 'selection') {
            // Manually move all layers which we dragged to other tree
            this.addNodes(data.records);
        }
    },

    filterRemote: function(tree, textvalue) {
        var treeStore = tree.getStore();
        if(textvalue !== '') {
            treeStore.getProxy().extraParams = {
                search: 'search',
                q: textvalue
            };
        }
        treeStore.load();
        treeStore.getProxy().extraParams = {};
    },

    filterNodes: function(tree, textvalue) {
        var me = this;
        var rootNode = tree.getRootNode();
        var treePanelType = tree.treePanelType;
        if(textvalue === '') {
            me.setAllNodesVisible(true, treePanelType);
        } else {
            me.setAllNodesVisible(true, treePanelType);
            var re = new RegExp(Ext.String.escapeRegex(textvalue), 'i');
            var visibleParents = [];
            var filter = function(node) {// descends into child nodes
                var addParents = function(node) {
                    if(node.parentNode != null) {// Dont add the root
                        var nodeid = node.get('id');
                        if(!Ext.Array.contains(nodeid)) visibleParents.push(nodeid);
                        addParents(node.parentNode);
                    }
                };
                if(node.get('type') != 'cswresult' || (node.get('type') == 'cswresult') && node.data.loadedService) {
                    node.expand(false, function() {// expand all nodes
                        if(node.hasChildNodes()) {
                            node.eachChild(function(childNode) {
                                if(childNode.isLeaf()) {
                                    if(!re.test(childNode.data.text)) {
                                        me.treePanels[treePanelType].filteredNodes.push(childNode.get('id'));
                                    } else {
                                        addParents(childNode.parentNode);
                                    }
                                } else if(!childNode.hasChildNodes() && re.test(childNode.data.text)) {// empty folder, but name matches
                                    addParents(childNode.parentNode);
                                } else {
                                    filter(childNode);
                                }
                            });
                        }
                        if(!re.test(node.data.text)) {
                            me.treePanels[treePanelType].filteredNodes.push(node.get('id'));
                        }
                    });
                } else {
                    if(!re.test(node.data.text)) {
                        me.treePanels[treePanelType].filteredNodes.push(node.get('id'));
                    }
                }
            };
            visibleParents = [];
            filter(rootNode);
            me.setAllNodesVisible(false, treePanelType, visibleParents);
        }
    },

    hasLeftTrees: function() {
        return (this.config.selectGroups || this.config.selectLayers || this.config.selectOwnServices || this.config.selectCsw);
    },

    setAllNodesVisible: function(visible, treePanelName, visibleParents) {
        var me = this;
        if(!visible) {
            // !visible -> A filter is being applied
            // Save all nodes that are being filtered in hiddenNodes array
            me.treePanels[treePanelName].hiddenNodes = me.treePanels[treePanelName].filteredNodes;
        } else {
            // visible -> No filter is applied
            // filteredNodes = hiddenNodes, so all hidden nodes will be made visible
            me.treePanels[treePanelName].filteredNodes = me.treePanels[treePanelName].hiddenNodes;
            me.treePanels[treePanelName].hiddenNodes = [];
        }
        var store = me.treePanels[treePanelName].treePanel.getStore();
        var view = me.treePanels[treePanelName].treePanel.getView();
        Ext.each(me.treePanels[treePanelName].filteredNodes, function(n) {
            var record = store.getNodeById(n);
            if (record !== null) {
                var el = Ext.fly(view.getNodeByRecord(record));
                if(el !== null) {
                    var tmpvis = visible;
                    if(Ext.isDefined(visibleParents) && Ext.Array.contains(visibleParents, n)) {
                        tmpvis = true;
                    }
                    el.setDisplayed(tmpvis);
                }
            }
        });
        me.treePanels[treePanelName].filteredNodes = [];
    },

    initApplicationLayers: function() {
        var me = this;
        var levels = [];
        var rootLevel = me.levels[me.rootLevel];
        if(Ext.isDefined(rootLevel.children)) {
            for(var i = 0 ; i < rootLevel.children.length; i++) {
                var l = me.addLevel(rootLevel.children[i], true, false, this.config.showBackgroundLevels);
                if(l !== null) {
                    l.expanded = true; // Make top levels expand
                    levels.push(l);
                }
            }
        }
        me.insertTreeNode(levels, me.treePanels.applicationTree.treePanel.getRootNode());
    },

    loadSelectedLayers: function() {
        var me = this;
        var nodes = [];

        var rootNode = me.treePanels.selectionTree.treePanel.getRootNode();
        // First remove all current children, could be a reload of the screen
        me.clearTree(rootNode);

        for ( var i = 0 ; i < me.selectedContent.length ; i ++){
            var contentItem = me.selectedContent[i];
            if(contentItem.type ==  "level") {
                var level = me.addLevel(contentItem.id, false, false, this.config.showBackgroundLevels);
                if(level != null){
                    nodes.push(level);
                }
            } else if(contentItem.type == "appLayer"){
                var layer = me.addLayer(contentItem.id);
                nodes.push(layer);
            }
        }
        me.insertTreeNode(nodes, rootNode);
    },

    addLevel: function(levelId, showChildren, showLayers, showBackgroundLayers, childrenIdsToShow,descriptions) {
        var me = this;
        if(!Ext.isDefined(me.levels[levelId])) {
            return null;
        }
        var level = me.levels[levelId];
        if(level.background && !showBackgroundLayers) {
            return null;
        }
        var description = descriptions ? descriptions[level.id] : null;
        var treeNodeLayer = me.createNode('n' + level.id, level.name, level.id, !Ext.isDefined(level.children), undefined,description);
        treeNodeLayer.type = 'level';
        // Create a leaf node when a level has layers (even if it has children)
        if(Ext.isDefined(level.layers)) {
            treeNodeLayer.type = 'maplevel';
            treeNodeLayer.nodeid = 'm' + level.id;
            treeNodeLayer.leaf = true;
            showChildren = false;
        }
        if(showChildren) {
            var nodes = [];
            if(Ext.isDefined(level.children)) {
                for(var i = 0 ; i < level.children.length; i++) {
                    var child = level.children[i];
                    if(!childrenIdsToShow || me.containsId(child,childrenIdsToShow)){
                        var l = me.addLevel(child, showChildren, showLayers, showBackgroundLayers,childrenIdsToShow,descriptions);
                        if(l !== null) {
                            nodes.push(l);
                        }
                    }
                }
            }
            if(Ext.isDefined(level.layers) && showLayers) {
                for(var j = 0 ; j < level.layers.length ; j ++) {
                    nodes.push(me.addLayer(level.layers[j]));
                }
            }
            treeNodeLayer.origData.children = nodes;
        }
        return treeNodeLayer;
    },

    containsId : function (level, ids){
        var l = this.levels[level];
        if(Ext.Array.contains(ids, parseInt(level))){
            return true;
        }
        if(l.children){
            for( var i = 0 ; i < l.children.length;i++){
                var child = l.children[i];
                var found = Ext.Array.contains(ids,parseInt(child));
                if(found){
                    return true;
                }else{
                    found = this.containsId(child, ids);
                    if(found){
                        return true;
                    }
                }
            }

        }
        return false;
    },

    addLayer: function (layerId){
        var me = this;
        if(!Ext.isDefined(me.appLayers[layerId])) {
            return null;
        }
        var appLayerObj = me.appLayers[layerId];
        var service = me.services[appLayerObj.serviceId];
        var layerTitle = appLayerObj.alias;
        var treeNodeLayer = me.createNode('l' + appLayerObj.id, layerTitle, service.id, true);
        treeNodeLayer.origData.layerName = appLayerObj.layerName;
        treeNodeLayer.type = 'appLayer';
        return treeNodeLayer;
    },

    createNode: function (nodeid, nodetext, serviceid, leaf, expanded,description) {
        if(typeof expanded === "undefined") expanded = false;
        var node =  {
            text: nodetext,
            name: nodetext,
            nodeid: nodeid,
            expanded: expanded,
            expandable:!leaf,
            leaf: leaf,
            origData: {
                id: nodeid.substring(0,2) === 'rl' ? nodeid : nodeid.substring(1),
                service: serviceid
            }
        };
        if(description){
            node["qtip"] = description.description;
        }
        return node;
    },

    insertTreeNode: function(node, root, autoExpand) {
        var returnNode = null;
        if(Ext.isArray(node)) {
            returnNode = [];
            for(var i = 0; i < node.length; i++) {
                returnNode.push(this.appendNode(node[i], root, autoExpand));
            }
        } else {
            returnNode = this.appendNode(node, root, autoExpand);
        }
        return returnNode;
    },
            
    appendNode: function(node, root, autoExpand) {
        if(typeof autoExpand == "undefined") autoExpand = true;
        var addedNode = this.insertNode(root, node);
        if(autoExpand) root.expand();
        return addedNode;
    },

    // Appending the whole tree at once gave issues in ExtJS 4.2.1
    // when there where sub-sub-childs present. Looping over childs,
    // and adding them manually seems to fix this
    insertNode: function(parentNode, insertNode) {
        var me = this,
            newParentNode = parentNode.appendChild(insertNode);
        if(insertNode.origData && insertNode.origData.children) {
            Ext.Array.each(insertNode.origData.children, function(childNode) {
                me.insertNode(newParentNode, childNode);
            });
        }
        return newParentNode;
    },

    handleSourceChange: function(field, newval, height) {
        var me = this;
        var customServiceUrlTextfield = Ext.getCmp('customServiceUrlTextfield');
        var customServiceUrlSelect = Ext.getCmp('customServiceUrlSelect');
        var customServiceUrlButton = Ext.getCmp('customServiceUrlButton');
        var applicationTreeContainer = Ext.get('applicationTreeContainer');
        var registryTreeContainer = Ext.get('registryTreeContainer');
        var customTreeContainer = Ext.get('customTreeContainer');
        var cswServiceUrlTextfield = Ext.getCmp('cswServiceUrlTextfield');
        var cswSearchTextfield = Ext.getCmp('cswSearchTextfield');
        var cswServiceUrlButton = Ext.getCmp('cswServiceUrlButton');
        var cswAdvancedSearchField = Ext.getCmp('cswAdvancedSearchField');

        if(newval && me.hasLeftTrees()) {
            if(me.config.selectOwnServices || me.config.selectCsw) {
                customServiceUrlTextfield.setVisible(false);
                customServiceUrlSelect.setVisible(false);
                customServiceUrlButton.setVisible(false);
                cswServiceUrlTextfield.setVisible(false);
                cswSearchTextfield.setVisible(false);
                cswServiceUrlButton.setVisible(false);
                cswAdvancedSearchField.setVisible(false);
                this.setTopHeight(0);
            }
            applicationTreeContainer.setStyle('visibility', 'hidden');
            registryTreeContainer.setStyle('visibility', 'hidden');
            customTreeContainer.setStyle('visibility', 'hidden');
            if(field == 'radioApplication') {
                applicationTreeContainer.setStyle('visibility', 'visible');
                me.activeTree = me.treePanels.applicationTree.treePanel;
            }
            if(field == 'radioRegistry') {
                registryTreeContainer.setStyle('visibility', 'visible');
                me.activeTree = me.treePanels.registryTree.treePanel;
            }
            if(field == 'radioCustom') {
                me.customServiceType = 'custom';
                customTreeContainer.setStyle('visibility', 'visible');
                me.activeTree = me.treePanels.customServiceTree.treePanel;
                customServiceUrlTextfield.setVisible(true);
                customServiceUrlSelect.setVisible(true);
                customServiceUrlButton.setVisible(true);
                this.setTopHeight(MobileManager.isMobile() ? 70 : 60);
            }
            if(field == 'radioCSW') {
                me.customServiceType = 'csw';
                customTreeContainer.setStyle('visibility', 'visible');
                me.activeTree = me.treePanels.customServiceTree.treePanel;
                cswServiceUrlTextfield.setVisible(Ext.isEmpty( this.config.showCswUrl)|| this.config.showCswUrl);
                cswSearchTextfield.setVisible(true);
                cswServiceUrlButton.setVisible(true);
                cswAdvancedSearchField.setVisible(this.config.advancedFilter);
                if(this.config.advancedFilter){
                    height = height || this.config.alwaysShow ? MobileManager.isMobile() ? 140 : 120 : MobileManager.isMobile() ? 90 : 80;
                }else{
                    height = height || MobileManager.isMobile() ? 50 : 40;
                }
                this.setTopHeight(height);
            }
        }
        me.resizeTrees();
    },

    setTopHeight: function(height) {
        Ext.getCmp(this.name + 'selectionModuleCustomFormContainer').setHeight(height);
        Ext.getCmp(this.name + 'selectionModuleTreesContainer').updateLayout();
    },

    populateCustomServiceTree: function(userService, node, autoExpand) {
        var me = this;
        if(typeof node === "undefined") {
            node = me.treePanels.customServiceTree.treePanel.getRootNode();
            // First remove all current children
            this.clearTree(node);
        }
        if(typeof autoExpand === "undefined") autoExpand = true;
        // Create service node
        var userServiceId = 'us' + (++me.addedServicesCount);
        userService.id = userServiceId;
        if(!Ext.isDefined(userService.serviceName)) userService.serviceName = userService.name;
        me.userServices[userServiceId] = userService;
        var serviceNode = me.createNode('s' + userServiceId, userService.name, null, false);
        serviceNode.type = 'service';
        serviceNode.origData.children = me.createCustomNodesList(userService.topLayer, userServiceId, true);
        me.insertTreeNode(serviceNode, node, autoExpand);
    },

    clearTree : function(rootNode){
        var delNode;
        while (delNode = rootNode.childNodes[0]) {
            rootNode.removeChild(delNode);
        }
    },

    populateCSWTree: function(results) {
        var me = this;
        var rootNode = me.treePanels.customServiceTree.treePanel.getRootNode();
        // First remove all current children
        this.clearTree(rootNode);
        // Create service node
        var cswResults = [];
        if( Object.prototype.toString.call( results ) === '[object Array]' ) {
            cswResults = results;
        } else if(results.hasOwnProperty('success') && results.hasOwnProperty('results') && results.success) {
            cswResults = results.results;
        }
        if(cswResults.length === 0) {
            return;
        }
        for(var i in cswResults) {
            me.addCSWResult(cswResults[i], rootNode);
        }
    },

    addCSWResult: function(cswResult, rootNode) {
        var me = this;
        var userServiceId = 'csw' + (++me.addedServicesCount);
        cswResult.id = userServiceId;
        var cswNode = me.createNode('csw' + userServiceId, cswResult.label, null, false, false);
        cswNode.type = 'cswresult';
        var addedNode = me.insertTreeNode(cswNode, rootNode, false);
        addedNode.data.loadedService = false;
        addedNode.addListener('beforeexpand', function() {
            if(addedNode && !addedNode.data.loadedService) {
                addedNode.data.loadedService = true;
                var si = Ext.create("viewer.ServiceInfo", {
                    protocol: cswResult.protocol,
                    url: cswResult.url
                });
                si.loadInfo(
                    function(info) {
                        me.populateCustomServiceTree(info, addedNode, true);
                    },
                    function(msg) {
                        Ext.MessageBox.alert("Foutmelding", msg);
                    }
                );
            }
        });
    },

    createCustomNodesList: function(node, userServiceId, isTopLayer) {
        var me = this;
        var treeNode = null;
        if(!node) {
            return;
        }
        var hasChildren = Ext.isDefined(node.children);
        // If topLayer is virtual, do not create node for topLayer
        if(!(isTopLayer && node.virtual)) {
            var leaf = true;
            if(hasChildren && node.children.length > 0) leaf = false;
            var layerId = 'usl' +  + (++me.addedLayersCount);
            treeNode = me.createNode('l' + layerId, node.title, null, leaf);
            treeNode.origData.layerName = node.name;
            treeNode.origData.alias = node.title;
            if(node.virtual){
                treeNode.type = 'level';
            }else{
                treeNode.type = 'appLayer';
            }

            treeNode.origData.userService = userServiceId;
        }
        if(hasChildren && node.children.length > 0) {
            var childnodes = [];
            for(var i = 0 ; i < node.children.length; i++) {
                var l = me.createCustomNodesList(node.children[i], userServiceId, false);
                if(l !== null) {
                    childnodes.push(l);
                }
            }
            // If no node was created for topLayer, return the children of the
            // topLayer
            if(isTopLayer && node.virtual) {
                return childnodes;
            }
            treeNode.origData.children = childnodes;
        }
        return treeNode;
    },
    
    moveNodes: function(direction) {
        var me = this;
        var rootNode = me.treePanels.selectionTree.treePanel.getRootNode();
        var selection = me.treePanels.selectionTree.treePanel.getSelectionModel().getSelection();
        var allNodes = rootNode.childNodes;
        var doSort = true;
        // First check if we are going to sort (we do not sort when the first item is selected and direction = up
        // or we do not sort when last item is selected and direction = down
        for(var i = 0; i < selection.length; i++) {
            var index = this.findIndex(allNodes, selection[i]);
            if((index === 0 && direction === 'up') || (index === (allNodes.length - 1) && direction === 'down')) {
                doSort = false;
            }
        }
        // If no sorting, return
        if(!doSort) {
            return;
        }
        // Sort selection by index
        selection.sort((function sortOnIndex(a, b) {
            var indexA = this.findIndex(allNodes, a);
            var indexB = this.findIndex(allNodes, b);
            return indexA - indexB;
        }).bind(this));
        // We manually sort because this is much faster than moving the nodes directly in the tree
        if(direction === 'down') {
            // Moving down we iterate back
            for(var i = (selection.length - 1); i >= 0; i--) {
                var index = this.findIndex(allNodes, selection[i]);
                this.moveNodeInArray(allNodes, index+1, index);
            }
        } else {
            // Moving up we iterate forward
            for(var i = 0; i < selection.length; i++) {
                var index = this.findIndex(allNodes, selection[i]);
                this.moveNodeInArray(allNodes, index-1, index);
            }
        }
        this.sortNodes(allNodes);
        this.reorderSelectedContent(allNodes);
    },
    
    moveNodesToPosition: function(data, below) {
        var rootNode = this.treePanels.selectionTree.treePanel.getRootNode();
        var allNodes = rootNode.childNodes;
        // Get the targetIndex
        var targetIndex = this.findIndex(allNodes, data.event.position.record);
        if(below) {
            targetIndex++;
        }
        // Sort records by index
        data.records.sort((function sortOnIndex(a, b) {
            var indexA = this.findIndex(allNodes, a);
            var indexB = this.findIndex(allNodes, b);
            if(below) {
                return indexA - indexB;
            }
            return indexA - indexB;
        }).bind(this));
        for(var i = 0; i < data.records.length; i++) {
            var current = this.findIndex(allNodes, data.records[i]);
            this.moveNodeInArray(allNodes, (current < targetIndex ? targetIndex - 1 : targetIndex), current);
            targetIndex++;
        }
        this.sortNodes(allNodes);
        this.reorderSelectedContent(allNodes);
    },
    
    sortNodes: function(allNodes) {
        // Set indexes
        for(var i = 0; i < allNodes.length; i++) {
            allNodes[i].set('index', i);
        }
        // Sort indexes
        this.treePanels.selectionTree.treeStore.sort('index', 'ASC');
    },
    
    findIndex: function(allNodes, node) {
        for(var i = 0; i < allNodes.length; i++) {
            if(allNodes[i].get('nodeid') === node.get('nodeid')) {
                return i;
            }
        }
        return -1;
    },
    
    moveNodeInArray: function(list, to, from) {
        list.splice(to, 0, list.splice(from, 1)[0]);
    },

    reorderSelectedContent: function(allNodes) {
        var me = this;
        function findIndex(allNodes, node) {
            for(var i = 0; i < allNodes.length; i++) {
                if(allNodes[i].get('nodeid').replace(/[^0-9]/ig, '') === node.id) {
                    return i;
                }
            }
            return -1;
        }
        me.selectedContent.sort(function sortOnIndex(a, b) {
            var indexA = findIndex(allNodes, a);
            var indexB = findIndex(allNodes, b);
            return indexA - indexB;
        });
    },

    addNodes: function(selection) {
        var me = this;
        Ext.Array.each(selection, function(record) {
            me.addToSelection(record);
        });
    },
    
    nodesAddAllowed: function(records) {
        // If we find 1 allowed record we allow adding (invalid ones will be filtered later)
        for(var i = 0; i < records.length; i++) {
            if(this.nodeAddAllowed(records[i])) {
                return true;
            }
        }
        return false;
    },
    
    nodeAddAllowed: function(record) {
        var nodeType = this.getNodeType(record);
        if(nodeType === "appLayer" || nodeType === "layer" || (nodeType === "maplevel" && (!this.nodeSelected(record, nodeType)))) {
            return true;
        }
        return false;
    },

    addToSelection: function(record) {
        var me = this;
        var nodeType = me.getNodeType(record);
        if(!this.nodeAddAllowed(record)) {
            return;
        }
        var rootNode = me.treePanels.selectionTree.treePanel.getRootNode();
        var recordOrigData = me.getOrigData(record);
        var recordid = record.get('id');
        if(nodeType == "layer") {
            recordid = 'rl' + recordid;
        }
        var searchNode = rootNode.findChild('id', recordid, false);
        if(searchNode !== null || rootNode === null) {
            return;
        }
        var objData = record.data;
        if(nodeType == "appLayer") {
            // Own service
            var customService = Ext.clone(me.userServices[recordOrigData.userService]);
            customService.status = 'new';
            me.addService(customService);
            me.addedLayers.push({
                background: false,
                checked: this.autoCheck(),
                id: recordOrigData.id,
                layerName: recordOrigData.layerName,
                alias: recordOrigData.alias,
                serviceId: customService.id,
                status: 'new'
            });
            me.selectedContent.push({
                id: recordOrigData.id,
                type: 'appLayer'
            });
        }
        else if(nodeType == "maplevel") {
            // Added from application
            me.addedLevels.push({id:recordOrigData.id,status:'new'});
            me.selectedContent.push({
                id: recordOrigData.id,
                type: 'level'
            });
            var level = this.levels[recordOrigData.id];
            if(level && !level.background && this.autoCheck()) {
                this.checkAllChildren(level, true);
            }
        }
        else if(nodeType == "layer") {
            // Added from registry
            var service = me.findService(record);
            objData = null;
            if(service != null) {
                service.status = 'new';
                me.addService(service);
                me.addedLayers.push({
                    background: false,
                    checked: this.autoCheck(),
                    id: recordid,
                    layerName: record.data.layerName,
                    alias: record.data.layerName,
                    serviceId: service.id,
                    status: 'new'
                });
                me.selectedContent.push({
                    id: recordid,
                    type: 'appLayer'
                });
                objData = me.createNode(recordid, record.get('name'), service.id, true);
                objData.type = 'appLayer';
                objData.origData.userService = service.id;
            }
        }
        if(objData !== null) {
            rootNode.appendChild(objData);
        }
    },
    
    autoCheck: function(type) {
        if(!type) {
            type = 'always';
        }
        return !this.config.hasOwnProperty('autoOnLayers') || this.config.autoOnLayers === type;
    },
    
    checkAllChildren: function(level, checked) {
        if(level.layers) {
            for(var i = 0; i < level.layers.length; i++) {
                this.checkLayer(level.layers[i], checked);
            }
        }
        if(level.children) {
            for(var j = 0; j < level.children.length; j++) {
                this.checkAllChildren(level.children[j], checked);
            }
        }
    },
    
    checkLayer: function(layerId, checked) {
        if(!this.appLayers[layerId]) {
            return;
        }
        this.appLayers[layerId].checked = checked;
    },

    findService: function(record) {
        var me = this;
        var parentNode = record.parentNode;
        // Root level reached and no service found
        if(parentNode == null) return null;
        if(me.getNodeType(parentNode) == "service") {
            return parentNode.data.service;
        } else {
            return me.findService(parentNode);
        }
    },

    /**
     * Makes sure the service for a layer will be available in the app
     */
    addService: function(customService) {
        var me = this;

        // If service was already added for a previous layer, do nothing
        if(Ext.Array.some(me.addedServices, function(addedService) {
            return addedService.id == customService.id;
        })) {
            return;
        }

        // Check if the service was already in app
        if(me.services[customService.id]) {
            // We may need to supplement the existing service with new layer
            // info - add all layer ids to the service info when saving
            me.layerMergeServices[customService.id] = customService;
        } else {
            // New service
            me.addedServices.push(customService);
        }
    },

    removeNodes: function(records) {
        var me = this;
        var rootNode = me.treePanels.selectionTree.treePanel.getRootNode();
        Ext.Array.each(records, function(record) {
            var nodeType = me.getNodeType(record);
            var recordOrigData = me.getOrigData(record);
            if(recordOrigData.service == null) {
                // Own service
                me.removeLayer(recordOrigData.id, null);
                me.removeService(recordOrigData.userService);
            }
            else if(nodeType == "maplevel" || nodeType == "level") {
                // Added from application
                me.removeLevel(recordOrigData.id, null);
            }
            else if(nodeType == "appLayer") {
                // Added from registry or application
                me.removeLayer(recordOrigData.id, null);
                me.removeService(recordOrigData.userService);
            }
            rootNode.removeChild(rootNode.findChild('id', record.get('id'), true));
        });
    },

    removeService: function(serviceid) {
        var me = this;
        var addedServices = [];
        var totalLayers = 0;
        if(serviceid != null) {
            Ext.Array.each(me.addedLayers, function(addedLayer) {
                if(addedLayer.serviceId == serviceid) totalLayers++;
            });
        }
        if(totalLayers == 0) {
            Ext.Array.each(me.addedServices, function(addedService) {
                if(addedService.id != serviceid) {
                    addedServices.push(addedService);
                }
            });
            me.addedServices = addedServices;
        }
    },

    removeLayer: function(layerid) {
        var me = this;
        var addedLayers = [];
        Ext.Array.each(me.addedLayers, function(addedLayer) {
            if(addedLayer.id != layerid) {
                addedLayers.push(addedLayer);
            }
        });
        var selectedContent = [];
        Ext.Array.each(me.selectedContent, function(content) {
            if(!(content.id == layerid && content.type == "appLayer")) {
                selectedContent.push(content);
            }
        });
        me.selectedContent = selectedContent;
        me.addedLayers = addedLayers;
    },

    removeLevel: function(levelid) {
        var me = this;
        var addedLevels = [];
        Ext.Array.each(me.addedLevels, function(addedLevel) {
            if(addedLevel.id != levelid) {
                addedLevels.push(addedLevel);
            }
        });
        var selectedContent = [];
        Ext.Array.each(me.selectedContent, function(content) {
            if(!(content.id == levelid && content.type == "level")) {
                selectedContent.push(content);
            }
        });
        me.selectedContent = selectedContent;
        me.addedLevels = addedLevels;
    },

    cancelSelection: function() {
        var me = this;
        // Remove layers, levels and services with status = new, a.k.a. not added to the selectedContent
        Ext.Array.each(me.addedLayers, function(addedLayer) {
            if(addedLayer.status == 'new') {
                me.removeLayer(addedLayer.id);
            }
        });

        Ext.Array.each(me.addedLevels, function(addedLevel) {
            if(addedLevel.status == 'new') {
                me.removeLevel(addedLevel.id);
            }
        });
        Ext.Array.each(me.addedServices, function(addedService) {
            if(addedService.status == 'new') {
                me.removeService(addedService.id);
            }
        });
        me.layerMergeServices = {};
        me.popup.hide();
    },

    saveSelection: function() {
        var me = this;
        var checkedFirstBackgroundLayer = null;
        Ext.Array.each(me.addedServices, function(addedService) {
            if(addedService.status == 'new') {
                addedService.status = 'added';
                me.config.viewerController.addService(addedService);
            }
        });
        Ext.Object.each(me.layerMergeServices, function(mergeServiceId, mergeService) {
            var mergedService = me.config.viewerController.app.services[mergeService.id];
            Ext.Object.each(mergeService.layers, function(name, layer) {
                if(mergedService.layers[name] == undefined) {
                    mergedService.layers[name] = layer;
                    mergedService.layers[name].status = "added";
                }
            });
        });
        Ext.Array.each(me.addedLevels, function(addedLevel) {
            if(addedLevel.status == 'new') {
                addedLevel.status = 'added';
                if(me.levels[addedLevel.id] && me.levels[addedLevel.id].background && checkedFirstBackgroundLayer === null && me.autoCheck('onlybackground')) {
                    checkedFirstBackgroundLayer = addedLevel.id;
                }
            }
        });
        Ext.Array.each(me.addedLayers, function(addedLayer) {
            if(addedLayer.status == 'new') {
                addedLayer.status = 'added';
                me.config.viewerController.addAppLayer(addedLayer);
            }
        });
        if(checkedFirstBackgroundLayer !== null) {
            var item;
            var checked;
            var level;
            for(var i = 0; i < me.selectedContent.length; i++) {
                item = me.selectedContent[i];
                if(item.type === "level"){
                    level = this.levels[item.id];
                    if(level && level.background){
                        checked = parseInt(level.id, 10) === parseInt(checkedFirstBackgroundLayer, 10);
                        level.checked = checked;
                        this.checkAllChildren(level, checked);
                    }
                }
            }
        }
        me.config.viewerController.setSelectedContent(me.selectedContent);
        me.popup.hide();
    },

    getNodeType: function(record) {
        if(Ext.isDefined(record.data) && Ext.isDefined(record.data.type)) return record.data.type;
        return null;
    },

    getOrigData: function(record) {
        if(Ext.isDefined(record.data) && Ext.isDefined(record.data.origData)) return record.data.origData;
        return null;
    },

    nodeSelected: function(record, nodeType) {
        var recordData = this.getOrigData(record);
        var foundNodeIndex = this.treePanels.selectionTree.treeStore.findBy(function(treeRecord){
            var treeNodeType = this.getNodeType(treeRecord);
            var treeNodeData = this.getOrigData(treeRecord);
            return (treeNodeType === nodeType && parseInt(treeNodeData.id, 10) === parseInt(recordData.id, 10));
        }, this);
        return foundNodeIndex !== -1;
    },

    getExtComponents: function() {
        var me = this;
        var extComponents = [];
        extComponents.push(this.name + 'selectionModuleMainContainer');
        extComponents.push(this.name + 'selectionModuleFormContainer');
        extComponents.push(this.name + 'selectionModuleCustomFormContainer');
        extComponents.push(this.name + 'selectionModuleTreeContentContainer');
        extComponents.push(this.name +'selectionModuleSaveFormContainer');
        extComponents.push(this.name +'selectionModuleTreesContainer');
        extComponents.push(this.name +'selectionModuleFormFieldContainer');
        return Ext.Array.merge(extComponents, me.getActiveTreePanelIds());
    }
});
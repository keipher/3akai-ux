/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
// load the master sakai object to access all Sakai OAE API methods
require(["jquery", "sakai/sakai.api.core"], function($, sakai){

    /**
     * @name sakai_global.addarea
     *
     * @class addarea
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.addarea = function(tuid, showSettings){

        var $addAreaContainer = $("#addarea_container");
        var $groupCreateNewAreaButton = $("#group_create_new_area");

        // Navigation
        var addAreaNavigationButton = ".addarea_content_menu_item button";
        var addAreaContentMenuItem = ".addarea_content_menu_item";
        var addAreaSubnavButton = ".subnav_button";

        // Containers
        var addAreaContentContainer = "#addarea_content_container";

        // Elements
        var addareaCreateDocButton = "#addarea_create_doc_button";

        // Classes
        var selected = "selected";
        var addAreaSubnavButtonClass = "subnav_button";


        ///////////
        // UTILS //
        ///////////

        /*
         * Centers the overlay on the screen and handles with variable widths of the overlay
         */
        var centerOverlay = function(){
            $addAreaContainer.animate({
                'margin-left': -1 * ($addAreaContainer.width() / 2 + 20)
            }, 400);
        };

        /*
         * Handles a click in the navigation and loads the new content if necessary
         */
        var switchNavigation = function(){
            $(addAreaContentMenuItem).removeClass(selected);
            $(this).parents(addAreaContentMenuItem).addClass(selected);
            if($(this).hasClass(addAreaSubnavButtonClass)){
                // Subnav item selected, add selected state
                $(addAreaSubnavButton).parent().removeClass("selected");
                $(this).parent().addClass("selected");
            } else if ($(this).hasClass("subnav_header")){
                $(addAreaSubnavButton).parent().removeClass("selected");
                $($(addAreaSubnavButton)[0]).parent().addClass("selected");
            }
            if (!$("#" + $(this).data("containertoshow")).is(":visible")){
                $(addAreaContentContainer + " > div").hide();
                $("#" + $(this).data("containertoshow")).show();
                centerOverlay();
            }
        };

        /*
         * Determines what type of Sakai Doc should be created and saved by looking at the visible container
         */
        var determineDocContext = function(){
            switch ($(addAreaContentContainer + " > div:visible").data("doc-type")){
                case "new":
                    createNewSakaiDoc();
                    break;
                case "contentlibrary":
                    createContentLibrary();
                    break;
                case "participants":
                    createParticipantsList();
                    break;
                case "widgets":
                    createWidgetPage();
                    break;
                default:
                  debug.warn("unrecognized area type: " + context);
                  break;
            }
        };


        /////////////////////////////////////////
        // GENERAL CREATE SAKAI DOCS FUNCTIONS //
        /////////////////////////////////////////

        /*
         * Create a new Sakai Document
         * @param {String} title Title of the Sakai Document
         * @param {String} permission ID of the permissions to be set
         * @param {String} pageContents Default content to be set on the Sakai Doc
         * @param {String|Boolean} preferredTitle Used to make a unique URL, can also be set to false 
         * @param {Object} widgetContents Contains data about any widgets on the page
         * @param {Boolean} nonEditable Defines if the Sakai doc will be editable or not
         * @param {Function} callback Function to be executed after setting (or failing to set) the permissions
         */
        var createSakaiDoc = function(title, permission, pageContents, preferredTitle, widgetContents, nonEditable, callback){
            var batchRequests = [];
            var realPermission = permission;
            if (permission === "advanced"){
                realPermission = "private";
            }
            var parameters = {
                "sakai:pooled-content-file-name": title,
                "sakai:description": "",
                "sakai:permissions": permission,
                "sakai:copyright": "creativecommons",
                "mimeType": "x-sakai/document"
            };

            // Prepare Sakai Doc
            var structure0 = {},
                toCreate = {};
            for (var i = 0; i < pageContents.length; i++) {
                var pageID = "",
                    pageTitle = "";

                // for multi-page creation, we don't care as much about the URL
                // since they're auto-generated pages
                if (pageContents.length > 1) {
                    pageTitle = "Page " + (i+1);
                    // if we wanted to make the URL names 'Page 1', etc, we'd make
                    // that change here by..
                    //   pageID = sakai.api.Util.makeSafeURL(pageId);
                    // buf I figure since it's expected that the user will change these
                    // pages names an id might be better in the URL at least until
                    // we allow changing the lhnav title to change the url/data store of the page
                    pageID = sakai.api.Util.generateWidgetId();
                // if we have a preferred title, let's use that
                } else if (preferredTitle) {
                    pageTitle = title;
                    pageID = sakai.api.Util.makeUniqueURL(preferredTitle, title, sakai_global.group.pubdata.structure0);
                // otherwise use the title of the page for the URL
                } else {
                    pageTitle = title;
                    pageID = sakai.api.Util.makeUniqueURL(title, null, sakai_global.group.pubdata.structure0);
                }
                var refID = sakai.api.Util.generateWidgetId();

                structure0[pageID] = {
                    "_title": pageTitle,
                    "_order": i,
                    "_ref": refID,
                    "_nonEditable": nonEditable,
                    "main": {
                        "_title": pageTitle,
                        "_order": 0,
                        "_ref": refID,
                        "_nonEditable": nonEditable
                    }
                };

                toCreate = {};
                toCreate[refID] = {
                    "page": pageContents[i]
                };
                batchRequests.push({
                    method: "POST",
                    parameters: {
                        ":operation": "import",
                        ":contentType": "json",
                        ":replace": true,
                        ":replaceProperties": true,
                        "_charset_": "utf-8",
                        ":content": $.toJSON(toCreate)
                    }
                });
            }

            for (var j in widgetContents){
                toCreate = {};
                toCreate[j] = widgetContents[j];
                batchRequests.push({
                    method: "POST",
                    parameters: {
                        ":operation": "import",
                        ":contentType": "json",
                        ":replace": true,
                        ":replaceProperties": true,
                        "_charset_": "utf-8",
                        ":content": $.toJSON(toCreate)
                    }
                });
            }

            parameters["structure0"] = $.toJSON(structure0);
            $.ajax({
                url: "/system/pool/createfile",
                type:"POST",
                data: parameters,
                dataType: "json",
                success: function(data){
                    var poolId = data._contentItem.poolId;
                    var struct = $.parseJSON(data._contentItem.item.structure0);
                    var itemURLName = "";
                    if (pageContents.length === 1) {
                        for (itemURLName in struct) {
                            if (struct.hasOwnProperty(itemURLName)) {
                                break;
                            }
                        }
                    } else {
                        itemURLName = sakai.api.Util.makeSafeURL(title);
                    }
                    for (var b = 0; b < batchRequests.length; b++){
                        batchRequests[b].url = "/p/" + poolId + ".resource";
                    }
                    sakai.api.Server.batch(batchRequests, function(success2, data2) {
                        if (success2) {
                            callback(poolId, itemURLName);
                        }
                    });
                }
            });
        };

        /*
         * Fetches the roles in a group
         * @return {Object} JSON object containing information about the different roles in the group
         */
        var fetchGroupRoles = function(){
            return $.parseJSON(sakai_global.group.groupData["sakai:roles"]);
        };

        /*
         * Set permissions on an existing Sakai Document
         * @param {String} urlName Title of the Sakai Document
         * @param {String} poolId ID of the document saved in the pool
         * @param {String} docPermission ID of the permissions to be set
         * @param {Boolean} existingNotMine Determines if the settings should be applied to an existing Sakai Doc that I own
         * @param {Function} callback Function to be executed after setting (or failing to set) the permissions
         */
        var setSakaiDocPermissions = function(urlName, poolId, docPermission, existingNotMine, callback){
            var filesArray = {};
            var permission = "private";
            if (docPermission === "public"){
                permission = "public";
            } else if (docPermission === "everyone"){
                permission = "everyone";
            }
            filesArray[urlName] = {
                "hashpath": poolId,
                "permissions": permission
            };
            var viewRoles = [];
            var editRoles = [];
            var roles = fetchGroupRoles();
            for (var i = 0; i < roles.length; i++){
                var role = roles[i];
                if (role.allowManage){
                    editRoles.push(role.id);
                } else {
                    viewRoles.push(role.id);
                }
            }
            if (existingNotMine) {
                var batchRequests = [];
                for (var j = 0; j < editRoles.length; j++) {
                    batchRequests.push({
                        "url": "/p/" + poolId + ".members.html",
                        "method": "POST",
                        "parameters": {
                            ":viewer": sakai_global.group.groupId + "-" + editRoles[j]
                        }
                    });
                }
                if (docPermission !== "advanced") {
                    for (var k = 0; k < viewRoles.length; k++) {
                        batchRequests.push({
                            "url": "/p/" + poolId + ".members.html",
                            "method": "POST",
                            "parameters": {
                                ":viewer": sakai_global.group.groupId + "-" + viewRoles[k]
                            }
                        });
                    }
                }
                sakai.api.Server.batch(batchRequests, function(success, data){
                    if (success) {
                        callback(poolId);
                    }
                 });
            } else {
                sakai.api.Content.setFilePermissions(filesArray, function(){
                    var batchRequests = [];
                    for (var l = 0; l < editRoles.length; l++) {
                        batchRequests.push({
                            "url": "/p/" + poolId + ".members.html",
                            "method": "POST",
                            "parameters": {
                                ":manager": sakai_global.group.groupId + "-" + editRoles[l]
                            }
                        });
                    }
                    if (docPermission !== "advanced") {
                        for (var m = 0; m < viewRoles.length; m++) {
                            batchRequests.push({
                                "url": "/p/" + poolId + ".members.html",
                                "method": "POST",
                                "parameters": {
                                    ":viewer": sakai_global.group.groupId + "-" + viewRoles[m]
                                }
                            });
                        }
                    }
                    sakai.api.Server.batch(batchRequests, function(success, data){
                        if (success) {
                            callback(poolId);
                        }
                    });
                });
            }
        };

        /*
         * Returns an item count for a structure
         */
        var getTotalCount = function(structure){
            var total = 0;
            for (var i in structure){
                total++;
            }
            return total;
        };

        /*
         * Add a Sakai Doc to a world
         * @param {String} urlName Safe title of the Sakai Document as it's stored inside of the system
         * @param {String} poolId ID of the document saved in the pool
         * @param {String} docTitle Title of the Sakai Document
         * @param {String} docPermission ID of the permissions to be set
         * @param {Boolean} nonEditable Defines if the Sakai doc will be editable or not
         * @param {Boolean} existingNotMine Determines if the settings should be applied to an existing Sakai Doc that I own
         * @param {Function} callback Function to be executed after setting (or failing to set) the permissions
         */
        var addSakaiDocToWorld = function(urlName, poolId, docTitle, docPermission, nonEditable, existingNotMine, callback){
            // Refetch docstructure information
            $.ajax({
                 url: "/~" + sakai_global.group.groupId + "/docstructure.infinity.json",
                 success: function(data){

                    var pubdata = sakai.api.Server.cleanUpSakaiDocObject(data);
                    var newView = [];
                    var newEdit = [];

                    if (docPermission === "public"){
                        newView.push("everyone");
                        newView.push("anonymous");
                    } else if (docPermission === "everyone"){
                        newView.push("everyone");
                    }

                    var roles = fetchGroupRoles();
                    for (var i = 0; i < roles.length; i++){
                        var role = roles[i];
                        if (role.allowManage){
                            if (existingNotMine) {
                                newView.push("-" + role.id);
                            } else {
                                newEdit.push("-" + role.id);
                            }
                        } else if (docPermission !== "advanced"){
                            newView.push("-" + role.id);
                        }
                    }

                    pubdata.structure0[urlName] = {
                        "_title": docTitle,
                        "_order": getTotalCount(pubdata.structure0),
                        "_pid": poolId,
                        "_view": $.toJSON(newView),
                        "_edit": $.toJSON(newEdit),
                        "_nonEditable": nonEditable
                    };

                    // Store view and edit roles
                    sakai_global.group.pubdata.structure0 = pubdata.structure0;
                    sakai.api.Server.saveJSON("/~" + sakai_global.group.groupId + "/docstructure", {
                        "structure0": $.toJSON(pubdata.structure0)
                    }, function(){
                        callback(poolId, urlName);
                    });
                }
            });
        };

        /*
         * Selects a Sakai Doc in the world to show and triggers the permissions overlay if necessary
         */
        var selectPageAndShowPermissions = function(poolId, path, docPermission){
            $addAreaContainer.jqmHide();
            if (docPermission === "advanced"){
                $(window).trigger("permissions.area.trigger", [{
                    isManager: true,
	                pageSavePath: "/p/" + poolId,
	                path: path,
	                savePath: "/~" + sakai_global.group.groupId + "/docstructure"
                }]);
            }
            $(window).trigger("rerender.group.sakai", [path]);
        };

        ///////////////////////
        // CREATE SAKAI DOCS //
        ///////////////////////

        /*
         * Initiates the creation of a new Sakai Doc
         */
        var createNewSakaiDoc = function(){
            var docTitle = $("#addarea_new_name").val();
            var docPermission = $("#addarea_new_permissions").val();
            var numPages = parseInt($("#addarea_new_numberofpages").val(), 10);
            var nonEditable = false;
            var pageContents = [];
            for (var i = 0; i < numPages; i++){
                pageContents.push("");
            }
            createSakaiDoc(docTitle, docPermission, pageContents, false, {}, nonEditable, function(poolId, urlName){
                setSakaiDocPermissions(urlName, poolId, docPermission, false, function(poolId1){
                    addSakaiDocToWorld(urlName, poolId1, docTitle, docPermission, nonEditable, false, function(poolId2, path){
                        selectPageAndShowPermissions(poolId2, path, docPermission);
                    });
                });
            });
        };

        /*
         * Initiates the creation of a new Content Library
         */
        var createContentLibrary = function(){
            var docTitle = $("#addarea_contentlist_name").val();
            var docPermission = $("#addarea_contentlist_permissions").val();
            var widgetID = sakai.api.Util.generateWidgetId();
            var pageContents = ["<img id='widget_mylibrary_" + widgetID + "' class='widget_inline' style='display: block; padding: 10px; margin: 4px;' src='/devwidgets/participants/images/participants.png' data-mce-src='/devwidgets/participants/images/participants.png' data-mce-style='display: block; padding: 10px; margin: 4px;' border='1'></p>"];
            var nonEditable = true;
            var widgetContents = {};
            widgetContents[widgetID] = {
                mylibrary: {
                    "groupid": sakai_global.group.groupId
                }
            };
            createSakaiDoc(docTitle, docPermission, pageContents, "library", widgetContents, nonEditable, function(poolId, urlName){
                setSakaiDocPermissions(urlName, poolId, docPermission, false, function(poolId1){
                    addSakaiDocToWorld(urlName, poolId1, docTitle, docPermission, nonEditable, false, function(poolId2, path){
                        selectPageAndShowPermissions(poolId2, path, docPermission);
                    });
                });
            });
        };

        var createParticipantsList = function(){
            var docTitle = $("#addarea_participants_name").val();
            var docPermission = $("#addarea_participants_permissions").val();
            var widgetID = sakai.api.Util.generateWidgetId();
            var pageContents = ["<img id='widget_participants_" + widgetID + "' class='widget_inline' style='display: block; padding: 10px; margin: 4px;' src='/devwidgets/participants/images/participants.png' data-mce-src='/devwidgets/participants/images/participants.png' data-mce-style='display: block; padding: 10px; margin: 4px;' border='1'></p>"];
            var nonEditable = true;
            var widgetContents = {};
            widgetContents[widgetID] = {
                participants: {
                    "groupid": sakai_global.group.groupId
                }
            };
            createSakaiDoc(docTitle, docPermission, pageContents, "participants", widgetContents, nonEditable, function(poolId, urlName){
                setSakaiDocPermissions(urlName, poolId, docPermission, false, function(poolId1){
                    addSakaiDocToWorld(urlName, poolId1, docTitle, docPermission, nonEditable, false, function(poolId2, path){
                        selectPageAndShowPermissions(poolId2, path, docPermission);
                    });
                });
            });
        };

        var createWidgetPage = function(){
            var docTitle = $("#addarea_widgets_name").val();
            var docPermission = $("#addarea_widgets_permissions").val();
            var selectedWidget = $("#addarea_widgets_widget").val();
            var widgetID = sakai.api.Util.generateWidgetId();
            var avatar = "";
            var widgetContents = {};
            for (var widget in sakai.widgets) {
                if (sakai.widgets[widget].id === selectedWidget){
                    avatar = sakai.widgets[widget].img;
                    if (sakai.widgets[widget].defaultConfiguration) {
                        widgetContents[widgetID] = sakai.widgets[widget].defaultConfiguration;
                    }
                    break;
                }
            }
            var pageContents = ["<img id='widget_" + selectedWidget + "_" + widgetID + "' class='widget_inline' style='display: block; padding: 10px; margin: 4px;' src='" + avatar + "' data-mce-src='" + avatar + "' data-mce-style='display: block; padding: 10px; margin: 4px;' border='1'></p>"];
            var nonEditable = false;
            createSakaiDoc(docTitle, docPermission, pageContents, false, widgetContents, nonEditable, function(poolId, urlName){
                setSakaiDocPermissions(urlName, poolId, docPermission, false, function(poolId1){
                    addSakaiDocToWorld(urlName, poolId1, docTitle, docPermission, nonEditable, false, function(poolId2, path){
                        selectPageAndShowPermissions(poolId2, path, docPermission);
                    });
                });
            });
        };

        ////////////////////
        // INITIALIZATION //
        ////////////////////

        /*
         * Shows the jqModal overlay for adding areas
         */
        var initializeJQM = function(){
            $addAreaContainer.jqm({
                modal: true,
                overlay: 20,
                toTop: true,
            });
            centerOverlay();
            $addAreaContainer.jqmShow();
        };

        var renderWidgets = function(){
            var widgets = [];
            for (var widget in sakai.widgets){
                if(sakai.widgets[widget].sakaidocs){
                    widgets.push(sakai.widgets[widget]);
                }
            }
            $("#addarea_widgets_widget").html(sakai.api.Util.TemplateRenderer("addarea_widgets_widget_container", {data: widgets, sakai: sakai}));
        }

        /*
         * Add binding to elements in the widget
         */
        var addBinding = function(){
            $(addAreaNavigationButton).click(switchNavigation);
            $(addareaCreateDocButton).click(determineDocContext);
        };

        $(window).bind("addarea.initiate.sakai", function(){
            initializeJQM();
            addBinding();
            renderWidgets();
        });
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("addarea");
});

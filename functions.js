// Go get the list of broadcasts for a particular day 
function getEvents(grabDate) {
    var loaderElement = document.getElementById("loadingInfo");
    loaderElement.classList.remove("hidden");
    // grabDate expected in format '2018-01-25';
    var epgURL = 'http://parliamentlive.tv/Guide/EpgDay?date='+grabDate+'T00%3A00%3A00%2B00%3A00';
    // Go get the EPG. Have to use CORS anywhere because of Cross Origin issues.
    $.ajax({
        url: 'https://cors-anywhere.herokuapp.com/'+epgURL,
        dataType: 'html',
        type: 'GET',
        // If it's possible to get the EPG then do this...
        success: function (data) {
            // Make the info a nice XML DOM element thingy
            var xmlString = data
              , parser = new DOMParser()
              , doc = parser.parseFromString(xmlString, "text/xml");           
            
            // Make an array of events: eventsList with description, guid
            var test = doc.getElementsByClassName("event");   
            var eventsList = Array();
            for (i=0; i<test.length; i++){
                var description = doc.getElementsByClassName("event")[i].innerHTML;
                var guid = doc.getElementsByClassName("event")[i].getAttribute("href");
                if (guid != null) {
                    var guid = guid.replace("/Event/Index/","");
                    eventsList.push({
                        description: description,
                        guid: guid
                    });
                } 
            }
            
            // Make the list of events into a dropdown list                        
            $("#selectEvent").empty();   
            var select = document.getElementById("selectEvent");    
            for(var i = 0; i < eventsList.length; i++) {
                var el = document.createElement("option");
                el.textContent = eventsList[i].description;
                el.value = eventsList[i].guid;
                select.appendChild(el);      
            }
            $("#infostore").empty();
 
            if(eventsList.length == 0){
                console.log("No Events For "+grabDate);
                loaderElement.classList.add("hidden");
                var optionsElement = document.getElementById("optionsButton");
                optionsElement.classList.remove("hidden");
            }
            for(var i = 0; i < eventsList.length; i++) {
                saveEventDetails(eventsList[i].guid);
            }
            
            var numberLoaded = 0;
            
            document.addEventListener("GUIDLoaded", function(e) {               
                numberLoaded = numberLoaded + 1;
                if(numberLoaded == eventsList.length){
                    setTimeout(function(){    
                        makeMultiview();
                        addLogIntoToPlayers();           
                        loaderElement.classList.add("hidden");
                        var optionsElement = document.getElementById("optionsButton");
                        optionsElement.classList.remove("hidden");
                    }, 500);
                }
                console.log(e.detail); 
            });
            
        } // sucess  
    });
    
}

// Go get helpful information for the given event
function saveEventDetails(eventGUID) {
    var eventURL = 'http://parliamentlive.tv/Event/GetMainVideo/'+eventGUID; 
    return $.ajax({
        url: 'https://cors-anywhere.herokuapp.com/'+eventURL,
        dataType: 'JSON', 
        type: 'GET',
        success: function (data) {
            var homeFilters = data.event.homeFilters;
            var div = document.createElement("div");
            div.setAttribute("id","store-"+eventGUID);    
            div.setAttribute("actualLiveStartTime",makeTimeNice(data.event.actualLiveStartTime));
            div.setAttribute("displayStartDate",makeTimeNice(data.event.displayStartDate));
            div.setAttribute("actualEndTime",makeTimeNice(data.event.actualEndTime));
            div.setAttribute("displayEndDate",makeTimeNice(data.event.displayEndDate));
            div.setAttribute("live",homeFilters.live);
            div.setAttribute("liveAndArchive",homeFilters.liveAndArchive);
            div.setAttribute("planningState",data.event.states.planningState); 
            div.setAttribute("recordingState",data.event.states.recordingState); 
            div.setAttribute("recordedState",data.event.states.recordedState); 
            div.setAttribute("playerState",data.event.states.playerState);
            div.setAttribute("channelName",data.event.channelName);
            div.setAttribute("room",data.event.room);
    
            document.getElementById("infostore").appendChild(div);
            var event = new CustomEvent("GUIDLoaded", { 
                "detail": "GUID Info Loaded for " +  eventGUID
            });
            document.dispatchEvent(event);            
        }
    });
}

// Make a broadcast multi-viewer of live events
function makeMultiview(){
    var events = document.getElementById("selectEvent").getElementsByTagName("option");
    $("#players").empty();
    $("#commonsPlayer").empty();
    $("#lordsPlayer").empty();
    document.getElementById("commonsPlayer").classList.add("hidden");
    document.getElementById("lordsPlayer").classList.add("hidden");
    var currentDiv = document.getElementById("players");
    var eventTypes = document.getElementById("eventTypes").value;
    var sortByThis = document.getElementById("sortBy").value;
    
    if(sortByThis != ""){
        // Add the extra sortable data to the events array
        for(i=0; i<events.length; i++){
            var eventTitle = events[i].innerText;
            var eventGUID = events[i].value;
            var el = document.getElementById("store-"+eventGUID);
            events[i].channel = el.getAttribute("channelname");
            events[i].state = el.getAttribute("playerstate");
            events[i].alpha = events[i].innerText;
            if(el.getAttribute("actuallivestarttime") == "undefined"){
                events[i].start = el.getAttribute("displaystartdate");
            } else {
                events[i].start = el.getAttribute("actuallivestarttime");
            }
            if(el.getAttribute("actualendtime") == "undefined"){
                events[i].end = el.getAttribute("displayenddate");
            } else {
                events[i].end = el.getAttribute("actualendtime");
            }
            
            events[i].location = el.getAttribute("room");
        }
   
        // Make a new array from the HTML collection to a proper array;
        var arr = Array.from(events);
        
        // Sort the array by the selected field
        var arrSorted = sortByField(arr,sortByThis);  
        console.log(arr);
        
        // Change the events variable to the newly sorted one.
        var events = arr;
    } else {
        var events = Array.from(events);
    }
    
    console.log('Loading Events that are status: ' + eventTypes + ' ordered by ' +sortByThis);    
    // Loop through each event
    for(i=0; i<events.length; i++){
        var eventTitle = events[i].innerText;
        var eventGUID = events[i].value;
        // Build an array of details
        var el = document.getElementById("store-"+eventGUID);
        var nodes=Array();
        var values=Array();
        var details= Array();
        for (var att, j = 0, atts = el.attributes, n = atts.length; j < n; j++){
            att = atts[j];
            if(att.nodeName != "id"){
                nodes.push(att.nodeName);
                values.push(att.nodeValue);
            }
        }
        for (j=0; j<nodes.length; j++){
            details[nodes[j]] = values[j];
        }
        if(details.live == "true"){
            var eventStatus = "live";
            var autoStartReplace = "autoStart=True";
        } else if (details.playerstate == "ARCHIVE"){
            var eventStatus = "vod";
            var autoStartReplace = "autoStart=False";
        } else if( details.playerstate == "PRELIVE"){
            var eventStatus = "pre";
            var autoStartReplace = "autoStart=False";
        } else {
			var eventStatus = "other";
			var autoStartReplace = "autoStart=False";
		}
        
        if(eventStatus == eventTypes || eventTypes == "all") {
            if(eventTitle == "House of Commons"){
                var commonsGUID = eventGUID;
                commonsPlayer = embedPlayerCode(commonsGUID)+'<h2 class="eventTitleLabel"><span class="multiLabel">'+eventTitle+'</span></h2><span id="commonsLogs"></span><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';
                document.getElementById("commonsPlayer").innerHTML = commonsPlayer.replace("autoStart=False",autoStartReplace);
                
                document.getElementById("commonsPlayer").setAttribute("guid",commonsGUID);
				var popOverHead = '<table class="table table-hover"><tbody>';
				var popOverBody = "";
				for(var index in details){
				    if(index !== "id"){
					    var popOverBody = popOverBody + '<tr><td scope="row">'+index+' </td><td>'+details[index]+'</td><tr/>'
					}
				}
				var popOverFooter = '</tbody></table>';
				var popOverContent = popOverHead + popOverBody + popOverFooter;
				document.getElementById("popOver-"+eventGUID).setAttribute("data-content",popOverContent);
                console.log('Loading Commons Player');
                document.getElementById("commonsPlayer").classList.remove("hidden");
                var commonsHasVideo = true; 
            } else if (eventTitle == "House of Lords"){
                var lordsGUID = eventGUID;
                lordsPlayer = embedPlayerCode(lordsGUID)+'<h2 class="eventTitleLabel"><span class="multiLabel">'+eventTitle+'</span></h2><span id="lordsLogs"></span><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';
                document.getElementById("lordsPlayer").innerHTML = lordsPlayer.replace("autoStart=False",autoStartReplace);;
				document.getElementById("lordsPlayer").setAttribute("guid",lordsGUID);
				var popOverHead = '<table class="table table-hover"><tbody>';
				var popOverBody = "";
				for(var index in details){
					var popOverBody = popOverBody + '<tr><th scope="row">'+index+' </td><td>'+details[index]+'</td><tr/>'
				}
				var popOverFooter = '</tbody></table>';
				var popOverContent = popOverHead + popOverBody + popOverFooter;
				document.getElementById("popOver-"+eventGUID).setAttribute("data-content",popOverContent);
                console.log('Loading Lords Player');
                document.getElementById("lordsPlayer").classList.remove("hidden");
                var lordsHasVideo = true;
            } else {
                var quarterNode = document.createElement("div");
                quarterNode.className = "col-lg-3";
                var playerNode = document.createElement("div");
                playerNode.className = "player";
                playerNode.setAttribute("id","player-"+eventGUID); 
                playerNode.innerHTML = '<iframe src="http://videoplayback.parliamentlive.tv/Player/Index/'+eventGUID+'?audioOnly=False&amp;'+autoStartReplace+'&amp;statsEnabled=True" id="UKPPlayer" name="UKPPlayer" title="UK Parliament Player" seamless="seamless" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe><h2 class="eventTitleLabel"><span class="multiLabel">'+eventTitle+'</span></h2><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';      
                quarterNode.appendChild(playerNode);
                currentDiv.appendChild(quarterNode);
				var popOverHead = '<table class="table table-hover"><tbody>';
				var popOverBody = "";
				for(var index in details){
					var popOverBody = popOverBody + '<tr><td scope="row">'+index+' </td><td>'+details[index]+'</td><tr/>'
				}
				var popOverFooter = '</tbody></table>';
				var popOverContent = popOverHead + popOverBody + popOverFooter;
				document.getElementById("popOver-"+eventGUID).setAttribute("data-content",popOverContent);
				
                console.log('Loading '+eventTitle+' Player');
            }
        }    
    }
    $(function () {
      $('[data-toggle="popover"]').popover({
			container: 'body'
		})
    })
    if(eventTypes == "live" && commonsHasVideo !== true){
        document.getElementById("commonsPlayer").innerHTML = '<img src="http://videoplayback.parliamentlive.tv/Content/img/planning.jpg" width="100%"><h2 class="eventTitleLabel"><span class="multiLabel">House of Commons</span></h2>';
    }
    if(eventTypes == "live" && lordsHasVideo !== true){
        document.getElementById("lordsPlayer").innerHTML = '<img src="http://videoplayback.parliamentlive.tv/Content/img/planning.jpg" width="100%"><h2 class="eventTitleLabel"><span class="multiLabel">House of Lords</span></h2>';
    }     
}

function addLogIntoToPlayers(){
    var events = document.getElementById("selectEvent").getElementsByTagName("option");
    
    // Loop through each event
    for(i=0; i<events.length; i++){
        var eventTitle = events[i].innerText;
        var eventGUID = events[i].value;
        // For now we're only interested in the logs for the main chambers...
        if(eventTitle == "House of Commons" || eventTitle == "House of Lords"){
            if(eventTitle == "House of Commons"){
                var commonsGUID = eventGUID;
            } else if (eventTitle == "House of Lords") {
                var lordsGUID = eventGUID;    
            }
            var eventURL = 'http://parliamentlive.tv/Event/Logs/'+eventGUID; 
            $.ajax({
                url: 'https://cors-anywhere.herokuapp.com/'+eventURL,
                dataType: 'html', 
                type: 'GET',
                success: function (data) {
                    keepEventGUID = this.url.replace('https://cors-anywhere.herokuapp.com/http://parliamentlive.tv/Event/Logs/','')            
                    doc = $.parseHTML(data);     
                    var logs = [];
                    for (i=0; i<doc.length; i++){
                        if(doc[i].nodeName == "#text"){
                        } else {
                            var logTime = doc[i].getElementsByClassName("time-code")[0].getAttribute("data-time");
                            var logContent = doc[i].getElementsByClassName("stack-item")[0].innerText;
                            var niceTime = makeTimeNice(logTime);
                            var a = niceTime.split(':'); // split it at the colons
                            var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);        
                            logs.push({
                                time: logTime,
                                niceTime : niceTime,
                                seconds: seconds,
                                content: logContent.trim() 
                            });
                        }
                    }
                    if(logs.length > 0) { 
                        logs.sort(function(a, b) {
                            return a.seconds - b.seconds;
                        });
                             
                        logsContent = '<a id="logsPop-'+keepEventGUID+'" data-html="true" tabindex="0" class="btn btn-success logsInfo" role="button" data-placement="left" data-toggle="popover" data-trigger="focus" title="Logs Info">'+logs.length+'</a>'
                        // console.log(logsContent);       
                        if(keepEventGUID == commonsGUID){
                            var logsDivName = "commonsLogs";
                            var addLogsInfo = true;
                            var houseName = "Commons";
                        } else if (keepEventGUID == lordsGUID){
                            var logsDivName = "lordsLogs";
                            var addLogsInfo = true;
                            var houseName = "Lords";
                        }
                        
                        if(addLogsInfo == true){
                            var logsDiv = document.getElementById(logsDivName);
                            
                            if (typeof(logsDiv) != 'undefined' && logsDiv != null){
                                logsDiv.innerHTML = logsContent;
                                var popOverContent = ("Time of Last Log: " + logs[logs.length - 1].niceTime + "<br />" + logs[logs.length - 1].content)
                                document.getElementById("logsPop-"+keepEventGUID).setAttribute("data-content",popOverContent);
                                console.log('Log info added for '+houseName);
                            }    
                        } else {
                
                        }
                        $(function () {
                          $('[data-toggle="popover"]').popover({
                                container: 'body'
                            })
                        })
                    } else {
                        console.log("No Logs for " + keepEventGUID);
                    }               
                }
            }); 
        }
    }
    
}

// Returns the general embed code for a given GUID. Autostart set to False   
function embedPlayerCode(eventGUID){
     embedCode = '<iframe src="http://videoplayback.parliamentlive.tv/Player/Index/'+eventGUID+'?audioOnly=False&amp;autoStart=False&amp;statsEnabled=True" id="UKPPlayer" name="UKPPlayer" title="UK Parliament Player" seamless="seamless" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>';
    return embedCode;
}    
   
function makeTimeNice(timeString) {
    if(timeString !== null){
		var timeStringSplit = timeString.split("T");
		var niceTime = timeStringSplit[1].replace("Z","");
		return niceTime;
	}
}
   
function calculateDuration(startTime,endTime){
    var a = startTime.split(':');
    var b = endTime.split(':');
    var startSeconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
    var endSeconds = (+b[0]) * 60 * 60 + (+b[1]) * 60 + (+b[2]);
    var duration = endSeconds - startSeconds;
    var durationTime = new Date(null);
    durationTime.setSeconds(duration);
    var durationForInput = addZero(durationTime.getHours()) + ':' + addZero(durationTime.getMinutes()) + ':' + addZero(durationTime.getSeconds());
    document.getElementById("duration").value = durationForInput;
    return duration;
}

// For use with time data, if you take a number of hours, minutes, seconds that need a zero, this will add one
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function hideLabels() {
	$(".eventTitleLabel").fadeToggle();
	$(".streamInfo").fadeToggle();
}

function sortByField(arr,sortByThis) {
        function compare(a,b) {
          if (a[sortByThis] < b[sortByThis])
            return -1;
          if (a[sortByThis] > b[sortByThis])
            return 1;
          return 0;
        }
    arr.sort(compare);
    return arr;
}

// Start all popovers
$('.popover-dismiss').popover({
  trigger: 'focus'
})
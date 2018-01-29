// Go get the list of broadcasts for a particular day 
function getEvents(grabDate) {
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
            var select = document.getElementById("selectEvent");
            $("#selectEvent").empty();          
            for(var i = 0; i < eventsList.length; i++) {
                var el = document.createElement("option");
                el.textContent = eventsList[i].description;
                el.value = eventsList[i].guid;
                select.appendChild(el);      
            }
            $("#infostore").empty();
            for(var i = 0; i < eventsList.length; i++) {
                saveEventDetails(eventsList[i].guid);
            }  
        }
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
        }
    });
}

// Get Logs for a particular event
function getEventLogs(eventGUID) {
    var eventURL = 'http://parliamentlive.tv/Event/Logs/'+eventGUID; 
    $.ajax({
        url: 'https://cors-anywhere.herokuapp.com/'+eventURL,
        dataType: 'html', 
        type: 'GET',
        success: function (data) {            
            doc = $.parseHTML(data);     
            var logs = [];
            for (i=0; i<doc.length; i++){
                if(doc[i].nodeName == "#text"){
                } else {
                    var logTime = doc[i].getElementsByClassName("time-code")[0].getAttribute("data-time");
                    var logContent = doc[i].getElementsByClassName("stack-item")[0].innerText;
                    logs.push({
                        time: logTime,
                        content: logContent.trim() 
                    });
                }
            }             
            // console.log(logs);
        }
    });

}

// Make a broadcast multi-viewer of live events
function makeMultiview(){
    var events = document.getElementById("selectEvent").getElementsByTagName("option");
    $("#players").empty();
    var currentDiv = document.getElementById("players");
    var eventTypes = document.getElementById("eventTypes").value;
    console.log('Loading Events that are status: '+eventTypes);    
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
            nodes.push(att.nodeName);
            values.push(att.nodeValue);
        }
        for (j=0; j<nodes.length; j++){
            details[nodes[j]] = values[j];
        }
        if(details.live == "true"){
            var eventStatus = "live";
            var autoStartReplace = "autoStart=True";
        } else if (details.liveandarchive == "true"){
            var eventStatus = "vod";
            var autoStartReplace = "autoStart=False";
        } else {
            var eventStatus = "pre";
            var autoStartReplace = "autoStart=False";
        }
        
        if(eventStatus == eventTypes || eventTypes == "all") {
            if(eventTitle == "House of Commons"){
                var commonsGUID = eventGUID;
                commonsPlayer = embedPlayerCode(commonsGUID)+'<h2><span class="multiLabel">'+eventTitle+'</span></h2><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';
                document.getElementById("commonsPlayer").innerHTML = commonsPlayer.replace("autoStart=False",autoStartReplace);
                document.getElementById("commonsPlayer").classList.remove("hidden");
				var popOverHead = '<table class="table table-hover"><tbody>';
				var popOverBody = "";
				for(var index in details){
					var popOverBody = popOverBody + '<tr><td scope="row">'+index+' </td><td>'+details[index]+'</td><tr/>'
				}
				var popOverFooter = '</tbody></table>';
				var popOverContent = popOverHead + popOverBody + popOverFooter;
				document.getElementById("popOver-"+eventGUID).setAttribute("data-content",popOverContent);
                console.log('Loading Commons Player');
                var commonsHasVideo = true; 
            } else if (eventTitle == "House of Lords"){
                var lordsGUID = eventGUID;
                lordsPlayer = embedPlayerCode(lordsGUID)+'<h2><span class="multiLabel">'+eventTitle+'</span></h2><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';
                document.getElementById("lordsPlayer").innerHTML = lordsPlayer.replace("autoStart=False",autoStartReplace);;
				var popOverHead = '<table class="table table-hover"><tbody>';
				var popOverBody = "";
				for(var index in details){
					var popOverBody = popOverBody + '<tr><th scope="row">'+index+' </td><td>'+details[index]+'</td><tr/>'
				}
				var popOverFooter = '</tbody></table>';
				var popOverContent = popOverHead + popOverBody + popOverFooter;
				document.getElementById("popOver-"+eventGUID).setAttribute("data-content",popOverContent);
                document.getElementById("lordsPlayer").classList.remove("hidden");
                console.log('Loading Lords Player');
                var lordsHasVideo = true;
            } else {
                var quarterNode = document.createElement("div");
                quarterNode.className = "col-lg-3";
                var playerNode = document.createElement("div");
                playerNode.className = "player";
                playerNode.innerHTML = '<iframe src="http://videoplayback.parliamentlive.tv/Player/Index/'+eventGUID+'?audioOnly=False&amp;'+autoStartReplace+'&amp;statsEnabled=True" id="UKPPlayer" name="UKPPlayer" title="UK Parliament Player" seamless="seamless" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe><h2><span class="multiLabel">'+eventTitle+'</span></h2><a id="popOver-'+eventGUID+'" data-html="true" tabindex="0" class="btn btn-danger streamInfo" role="button" data-toggle="popover" data-trigger="focus" title="'+eventTitle+'">'+details.playerstate+'</a>';      
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
    if(commonsHasVideo !== true){
        document.getElementById("commonsPlayer").innerHTML = '<img src="http://videoplayback.parliamentlive.tv/Content/img/planning.jpg" width="100%"><h2><span class="multiLabel">House of Commons</span></h2>';
    }
    if(lordsHasVideo !== true){
        document.getElementById("lordsPlayer").innerHTML = '<img src="http://videoplayback.parliamentlive.tv/Content/img/planning.jpg" width="100%"><h2><span class="multiLabel">House of Lords</span></h2>';
    }     
}

// Returns the general embed code for a given GUID. Autostart set to False   
function embedPlayerCode(eventGUID){
     embedCode = '<iframe src="http://videoplayback.parliamentlive.tv/Player/Index/'+eventGUID+'?audioOnly=False&amp;autoStart=False&amp;statsEnabled=True" id="UKPPlayer" name="UKPPlayer" title="UK Parliament Player" seamless="seamless" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>';
    return embedCode;
}    
   
function makeTimeNice(timeString) {
    var timeStringSplit = timeString.split("T");
    var niceTime = timeStringSplit[1].replace("Z","");
    return niceTime;
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

    
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

$('.popover-dismiss').popover({
  trigger: 'focus'
})

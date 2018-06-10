var apiKey = "";
var subscribedContent = [];
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.loaded){
      //start authentication
      chrome.identity.getAuthToken({ 'interactive': false }, function(token) {
        if(chrome.runtime.lastError/*&& chrome.runtime.lastError.message == "The user is not signed in."*/){
          //show panel with not logged in
          sendResponse({subscribedContent:null});
        } else if(token){
          //refresh arrays
          subscribedContent = [];
          //get subscribed channel ids
          $.get('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&fields=items(snippet(channelTitle%2CresourceId%2FchannelId))' +
              '&key=' + apiKey +
              '&access_token=' + token, function(data){
              if(data){
                var channelIds = [];
                data.items.forEach(function(item){
                  channelIds.push(item.snippet.resourceId.channelId);
                });
                //async call
                loopContent(data, channelIds, token, sendResponse);
              }
          });
        }
      });
    }
    //send response async so return true
    return true;
});

//reverse chronological
function compare(a,b){
  if(a.publishedAt < b.publishedAt){
    return 1;
  }
  if(a.publishedAt > b.publishedAt){
    return -1;
  }
  return 0;
}

function formatViews(views){
  var tempViews = Math.floor(views / 1000000);
  if(views >= 10000000){
    return "".concat(tempViews, "M");
  }
  if(views < 10000000 && tempViews >= 1){
    tempViews = Math.floor(views / 100000) / 10;
    return "".concat(tempViews, "M");
  }
  tempViews = Math.floor(views / 1000);
  if(tempViews >= 1){
    return "".concat(tempViews, "K");
  }
  return views;
}

function asyncGetVideoInfo(ids){
  return new Promise(function(resolve, reject){
    $.get('https://www.googleapis.com/youtube/v3/videos?part=contentDetails%2Cstatistics%2CliveStreamingDetails&id=' + ids + 
      '&fields=items(contentDetails%2Fduration%2CliveStreamingDetails%2FconcurrentViewers%2Cstatistics%2FviewCount)&key=' + apiKey, function(data){
        if(data){
          for (var i = 0; i < data.items.length; i++) {
            //get viewCount and format
            var views = data.items[i].statistics.viewCount;
            subscribedContent[i].viewCount = formatViews(views);
            //format duration
            var duration = data.items[i].contentDetails.duration;
            duration = duration.replace("PT", ":");
            duration = duration.replace("H", ":");
            duration = duration.replace("M", ":");
            duration = duration.replace("S", "");
            var newDuration = "";
            duration.split(":").forEach(function(character){
              if(character){
                if(character < 10){
                  newDuration = newDuration.concat("0");
                }
                newDuration = newDuration.concat(character, ":");
              }
            });
            //remove last :
            newDuration = newDuration.substring(0, newDuration.lastIndexOf(":"));
            //remove first 0, ex:05:31
            if(newDuration.indexOf("0") == 0){
              newDuration = newDuration.replace("0", "");
            }
            //if under 1min video add 0:
            if(newDuration.indexOf(":") < 0){
              newDuration = "0:".concat(newDuration);
            }
            subscribedContent[i].duration = newDuration;
            //get live viewers
            if(data.items[i].liveStreamingDetails){
              subscribedContent[i].liveViewers = data.items[i].liveStreamingDetails.concurrentViewers;
            }
          }
          resolve(null);
        } else{
          reject(null);
        }
    });
  });
}
//thanks kennebec and iammatthew2 https://stackoverflow.com/a/14482123
function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
} 

async function getVideoInfo(ids, callback){
  var videoIds = ids.split(",");
  //max ids in query is 50
  var pos = nthIndex(videoIds, ",", 50);
  if(pos == -1){
    pos = ids.length;
  }
  while(ids.length > 0){
    shortVideoIds = ids.substring(0, pos);
    ids = ids.substring(pos+1, ids.length);
    await asyncGetVideoInfo(shortVideoIds);
  }
  callback();
}

function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval > 1) {
      return interval + " years ago";
    } else if(interval == 1){
       return interval + " year ago";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval + " months ago";
    } else if(interval == 1){
      return interval + " month ago";
    }
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval + " days ago";
    } else if(interval == 1){
      return interval + " day ago";
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval + " hours ago";
    } else if(interval == 1){
      return interval + " hour ago";
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval + " minutes ago";
    } else if(interval == 1){
      return interval + " minute ago";
    }
    if(seconds > 1){
      return Math.floor(seconds) + " seconds ago";
    }
    return Math.floor(seconds) + " second ago";
}

async function loopContent(data, channelIds, token, sendResponse){
  var videoIds = "";
  for (var i = 0; i < data.items.length; i++) {
    await getSubscribedContent(i, channelIds[i], token);
  }
  //remove last ','
  var videoIds = "";
  subscribedContent.forEach(function(item){
    videoIds = videoIds.concat(item.videoId, ",");
  });
  var pos = videoIds.lastIndexOf(',');
  videoIds = videoIds.substring(0, pos);
  //get video durations
  getVideoInfo(videoIds, function(){
    //sort elements
    subscribedContent.sort(compare);
    //change date to time elapsed since, ex: 1 day ago
    subscribedContent.forEach(function(item){
      item.publishedAt = timeSince(item.publishedAt);
    });
    //create panel html
    generatePanelHTML(function(generatedHTML){
      sendResponse({subscribedContent:generatedHTML});
    });
  });
}

function generatePanelHTML(callback){
  var beforeThumbnailsHTML = '<div id="subPanel" style="border-bottom: 1px solid rgb(238, 238, 238);display: block;"><div style="margin-top: 24px;"><div style="color: rgb(17, 17, 17);height: 2rem;display: flex;flex-direction: row;align-items: center;"><h2 style="display: flex;flex-direction: row;align-items: center;"><span style="color: rgb(17, 17, 17);display: block;max-height: 2rem;overflow: hidden;font-size: 1.6rem;font-weight: 500;line-height: 2rem;">My Subscriptions</span></h2><div style="flex: 1;"></div></div></div><div style="margin-top: 24px;"><div id="thumbnail-items" style="display: flex;flex-direction: row;flex-wrap: wrap;">';
  var allThumbnailItems = '';
  var afterThumbnailsHTML = '</div><div style="color: rgba(17, 17, 17, 0.6);margin:0;padding: 0;margin-right: auto;margin-bottom: 24px;font-size: 1.3rem;font-weight: 500;letter-spacing: 0.007px;text-transform: uppercase;display: inline-block;text-align: center;font-family: inherit;"><div id="showMoreButton" style="color: rgba(17, 17, 17, 0.6);font-size: 1.3rem;font-weight: 500;letter-spacing: .007px;text-transform: uppercase;text-align: center;font-family: inherit;font-size: 13px;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);font-stretch: 100%;font-style: normal;display: inline;cursor: pointer;font-variant-caps: normal;font-variant-east-asian: normal;font-variant-ligatures: normal;font-variant-numeric: normal;height: auto;line-height: normal;width: auto;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);-webkit-font-smoothing:antialiased;user-select:none;">Show more</div></div></div></div><style>.channel-name{color: rgba(17, 17, 17, 0.6);}.channel-name:hover{color: rgba(17, 17, 17, 0.8);}.view-count:after{content: "•";margin:0 4px;}</style><script type="text/javascript">var lastThumbnailPosition=0;var thumbnailCounter=0;var finalThumbnailColumnCounter=0;var totalRowsShowing=1;loadThumbnails(2);$(".thumbnail-item").hover(function(){$(this).find(".duration-overlay").hide();}, function(){$(this).find(".duration-overlay").show();});$("#showMoreButton").click(function(){loadThumbnails(totalRowsShowing+4);});function loadThumbnails(desiredRow){$("#subPanel .thumbnail-item").each(function(index){index+=1;if(index>thumbnailCounter){thumbnailCounter+=1;$(this).css("display","inline-block");if($("#subPanel .thumbnail-item").length <=index){$("#showMoreButton").parent().hide();}if(thumbnailCounter==1){lastThumbnailPosition=$(this).position().top;}if(lastThumbnailPosition < $(this).position().top && totalRowsShowing <=1){finalThumbnailColumnCounter=thumbnailCounter - 1;}if(lastThumbnailPosition < $(this).position().top){totalRowsShowing +=1;}if(totalRowsShowing >=desiredRow && thumbnailCounter==finalThumbnailColumnCounter*desiredRow){return false;}lastThumbnailPosition=$(this).position().top;}});}</script>';
  subscribedContent.forEach(function(item) {
    var thumbnailItem = generateThumbnailItem(item);
    allThumbnailItems+=thumbnailItem;
  });
  generatedHTML = beforeThumbnailsHTML + allThumbnailItems + afterThumbnailsHTML;
  callback(generatedHTML);
}

function generateThumbnailItem(item) {
  var channelTitle = item.channelTitle;
  var channelId = item.channelId;
  var duration = item.duration;
  var publishedAt = item.publishedAt;
  var thumbnailURL = item.thumbnailHigh.url;
  var videoId = item.videoId;
  var videoTitle = item.videoTitle;
  var viewCount = item.viewCount;
  var live = item.live;
  var liveViewers = item.liveViewers;

  //live watching tag vs views and date
  var HTMLviewDate = '<span class="view-count">' + viewCount + ' views</span> <span class="published-at">' + publishedAt + '</span> </div></div>';
  var HTMLliveWatching = '<span>' + liveViewers + ' watching</span> </div></div>';
  var HTMLPart1 = '<div class="thumbnail-item" style="display:none;width:210px;height: 204px;margin-right: 4px;margin-bottom: 24px;"><div style="width:210;position:relative;" ><a href="/watch?v='+videoId+'"><div style="background-color: transparent;width:210px;height:118px;overflow:hidden;white-space:nowrap;position:relative;"><img width="210" src="' + thumbnailURL + '" style="position:absolute;top:0px;bottom:0px;margin:auto;"></div>';
  //this is the duration part (not for live video)
  var HTMLPart2 = '<div class="duration-overlay" style="background-color:hsl(0, 0%, 6.7%);position:absolute;bottom:0;right:0;margin:4px;color:hsl(0, 0%, 100%);opacity:.8;padding:2px 4px;border-radius:2px;letter-spacing:.5px;font-size:1.2rem;font-weight:500;line-height:1.2rem;flex-direction:row;align-items: center; display:inline-flex;"><span>' + duration + '</span></div>';
  var HTMLPart3 = '</a></div><div style="position: relative;cursor: pointer;display: flex;flex-direction: column;"> <h3 style="margin:8px 0 8px;"> <a href="/watch?v=' + videoId + '" title="' + videoTitle + '" style="display: -webkit-box;max-height: 3.2rem;-webkit-box-orient: vertical;overflow:hidden;text-overflow: ellipsis;white-space: normal;-webkit-line-clamp:2;font-size: 1.4rem;font-weight: 500;line-height: 1.6rem;cursor: pointer;text-decoration: none;color: rgb(17, 17, 17);">' + videoTitle + '</a> </h3> <div style="display: flex;flex-direction: column;"> <div style="max-width: 100%;max-height: 1.8rem;overflow: hidden;font-size: 1.3rem;font-weight: 400;line-height: 1.8rem;text-transform: none;flex-wrap: wrap;display: flex;flex-direction: row;align-items: center;"> <a class="channel-name" style="overflow: hidden;text-overflow: ellipsis;white-space: nowrap;margin-right: -0.1em;padding-right: 0.1em;text-decoration: none;" href="/channel/' + channelId + '">' + channelTitle + '</a> </div><div style="list-style-type: max-width:100%;color: rgba(17, 17, 17, 0.6);line-height: 1.8rem;max-height: 3.6rem;overflow: hidden;font-size: 1.3rem;font-weight: 400;text-transform: none;display: flex;flex-wrap: wrap;">';
  //this is the live video part
  var HTMLPart4 = '<div> <div style="color:hsl(3, 81.8%, 49.6%);border:1px solid hsl(3, 81.8%, 49.6%);padding:2px 4px;font-size: 1.2rem;font-weight: 500;line-height: 1.2rem;white-space: nowrap;display: inline-block;border-radius: 2px;"> <span>LIVE NOW</span> </div></div>';
  var HTMLPart5 = '</div></div>';
  if(!live) {
    var thumbnailItem = HTMLPart1 + HTMLPart2 + HTMLPart3 + HTMLviewDate + HTMLPart5
  } else {
    var thumbnailItem = HTMLPart1 + HTMLPart3 + HTMLliveWatching + HTMLPart4 + HTMLPart5
  }
  return thumbnailItem;
}

function getSubscribedContent(i, channelId, token){
  return new Promise(function(resolve, reject){
    $.get('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + channelId + '&order=date&fields=items(id%2FvideoId%2Csnippet(channelTitle%2CliveBroadcastContent%2CpublishedAt%2Cthumbnails(default%2Chigh%2Cmedium)%2Ctitle))&key=' + apiKey +
        '&access_token=' + token, function(data){
            if(data){
              data.items.forEach(function(item){
                if(item.id){
                  var date = new Date(item.snippet.publishedAt);
                  var isLive = item.snippet.liveBroadcastContent != "none";
                   subscribedContent.push({channelId:channelId, videoTitle:item.snippet.title, videoId:item.id.videoId, live:isLive, liveViewers:'0', channelTitle:item.snippet.channelTitle, publishedAt:date, viewCount:'', duration:'',
                   thumbnailDefault:{url:item.snippet.thumbnails.default.url, height:item.snippet.thumbnails.default.height, width:item.snippet.thumbnails.default.width},
                   thumbnailHigh:{url:item.snippet.thumbnails.high.url, height:item.snippet.thumbnails.high.height, width:item.snippet.thumbnails.high.width},
                   thumbnailMedium:{url:item.snippet.thumbnails.medium.url, height:item.snippet.thumbnails.medium.height, width:item.snippet.thumbnails.medium.width}});
                }
              });
              resolve(null);
            } else{
              reject(null);
            }
        });
  });
};
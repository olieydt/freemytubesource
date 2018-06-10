document.addEventListener("DOMContentLoaded", function(event) {
	if(window.location.href == "https://www.youtube.com/"){
		//add loading screen
		addPanel('<div id="subPanel-loading" style="border-bottom: 1px solid rgb(238, 238, 238);display: block;"><div style="margin-top: 24px;"><div style="color: rgb(17, 17, 17);height: 2rem;display: flex;flex-direction: row;align-items: center;"><h2 style="display: flex;flex-direction: row;align-items: center;"><span id="subPanelTitle" style="color: rgb(17, 17, 17);display: block;max-height: 2rem;overflow-wrap: break-word;font-size: 1.6rem;font-weight: 500;line-height: 2rem;">My Subscriptions</span></h2><div style="flex: 1;"></div></div></div><div style="margin-top: 24px;"><div id="thumbnail-items-loading" style="display: flex;flex-direction: row;flex-wrap: wrap;"><div class="thumbnail-item-loading" style="display:inline-block;width:210px;height: 204px;margin-right: 4px;margin-bottom: 24px;"><div style="width:210;position:relative;" ><div style="background-color: hsl(0, 0%, 89%);width:210px;height:118px;"></div></div><div style="position: relative;display: flex;flex-direction: column;"> <div style="width: 210px;height: 20px;margin: 10px 0px;background-color: hsl(0, 0%, 89%);border-radius: 2px;"></div><div style="width: 130px;height: 20px;margin: 0;background-color: hsl(0, 0%, 89%);border-radius: 2px;"></div></div></div></div></div></div><script type="text/javascript">var lastThumbnailPosition=0;var thumbnailCounter=0;var finalThumbnailColumnCounter=0;var totalRowsShowing=1;var allLoaded=false;var currentElement=$("#subPanel-loading .thumbnail-item-loading");loadThumbnails(2);function loadThumbnails(desiredRow){while(!allLoaded){thumbnailCounter+=1;if(thumbnailCounter==1){lastThumbnailPosition=currentElement.position().top;}else{currentElement=currentElement.clone();currentElement.appendTo("#subPanel-loading #thumbnail-items-loading");}if(lastThumbnailPosition < currentElement.position().top && totalRowsShowing <=1){finalThumbnailColumnCounter=thumbnailCounter - 1;}if(lastThumbnailPosition < currentElement.position().top){totalRowsShowing +=1;}if(totalRowsShowing >=desiredRow && thumbnailCounter==finalThumbnailColumnCounter*desiredRow){allLoaded=true;}lastThumbnailPosition=currentElement.position().top;}}</script>');
	    chrome.runtime.sendMessage({loaded: true}, function(response) {
	  		//load response in panel
	  		if(response && response.subscribedContent){
	  			$("#subPanel-loading").remove();
	  			addPanel(response.subscribedContent);
		  		if(window.location.href == "https://www.youtube.com/"){
					document.getElementById("subPanel").style.display = "block";
				}
				window.setInterval(urlChange, 1000);
	  		} else{
	  			document.getElementById("subPanelTitle").innerHTML = 'My Subscriptions (Sign in by clicking the <img style="height:16px;width:16px;" src="chrome-extension://midpnfppailgfifdgjiddedghmhmanjo/logo_128.png"> icon, then refresh the page)';
	  		}
		});
	}
	//ensure that the page is reloaded to ensure that subscription panel is fresh
	document.getElementById("logo").addEventListener('click', function(){
		location.reload();
	});
});

function addPanel(html){
	$("#contents.style-scope.ytd-section-list-renderer").prepend(html);
}

function urlChange(){
	if(window.location.href != "https://www.youtube.com/"){
		document.getElementById("subPanel").style.display = "none";
	} else{
		document.getElementById("subPanel").style.display = "block";
	}
}
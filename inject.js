document.addEventListener("DOMContentLoaded", function(event) {
	if(window.location.href == "https://www.youtube.com/"){
	    chrome.runtime.sendMessage({loaded: true}, function(response) {
	  		//load response in panel
	  		if(response && response.subscribedContent){
	  			addPanel(response.subscribedContent);
		  		if(window.location.href == "https://www.youtube.com/"){
					document.getElementById("subPanel").style.display = "block";
				}
				window.setInterval(urlChange, 1000);
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
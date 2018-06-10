window.onload = function(){
  chrome.identity.getAuthToken({ 'interactive': false }, function(token) {
    if(!chrome.runtime.lastError && token){
      document.getElementById("authBtn").innerHTML = "SIGN OUT";
    }
  });
}
var apiKey = "";
document.getElementById("authBtn").addEventListener('click', function(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
      if(chrome.runtime.lastError){
        document.getElementById("authStatus").style.display = "inline";
      } else if(token){
        document.getElementById("authStatus").style.display = "none";
        if(document.getElementById("authBtn").innerHTML == "SIGN IN"){
          //refresh page once logged in
          refreshPage(tabs[0].id, function(){
            document.getElementById("authBtn").innerHTML = "SIGN OUT";
          });
        } else{
          chrome.identity.removeCachedAuthToken({token:token}, function() {
            $.get("https://accounts.google.com/o/oauth2/revoke?token=" + token, function(){
              refreshPage(tabs[0].id, function(){
                document.getElementById("authBtn").innerHTML = "SIGN IN";
              });
            });
          });
        }
      }
    }); 
  });
});


function refreshPage(tabId, callback){
  chrome.tabs.reload(tabId, function(){
    callback();
  });
}
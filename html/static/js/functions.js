	
function isset(value, def){
	if(value != null && value != "undefined" && value != "" && value != "NaN" && value != NaN && value != def){
		return true;
	} else {
		return false;
	}
}

function getid(e){
	return document.getElementById(e);
}

function show(id){
	getid(id).style.display = "block";
}

function hide(id){
	getid(id).style.display = "none";
}

function toObject(t){
	return (typeof(t) == "string") ? $(t) : t ;
}

function addEvent(object, event, func, option){
	// Remember the Old Event
	var oldevent = object[event];
	object[event] = function(e){
		// Run Old Function
		if(oldevent){ 
			if(option != false && option != "just"){
				oldevent(e); 
			}
		}
		// Run Added Function
		func();
		// If Option is Not Null
		if(isset(option)){
			// Remove the added Function 
			if(option == true || option == "just"){
				object[event] = oldevent;
			// Replace with the added Function	
			} else if( option == false){
				object[event] = func;
			}
		}
	}
}

function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function stopEvent(event, object){
	if(event.preventDefault){
		event.preventDefault();
	}
	
	// If Object is Set
	if(isset(object)){
		// Create Safe Object Reference
		object = toObject(object);
		
		object[event] = function(childEvent){
			if(childEvent && childEvent.stopPropagation) {
				childEvent.stopPropagation();
			} else {
				childEvent = window.event;
				childEvent.cancelBubble = true;
			}
		}
	} else {
		if(event && event.stopPropagation) {
			event.stopPropagation();
		} else {
			event = window.event;
			event.cancelBubble = true;
		}
	}
}

var last_toggle_id;
// Toggle Element
function toggle(id){
	object = getid(id);
	
	if(isset(last_toggle_id)){
		if(last_toggle_id != id){
			if(getid(last_toggle_id).style.display == "block"){
				getid(last_toggle_id).style.display = "none";
			}
		}
	}
	
	if(object.style.display == 'none'){
		object.style.display = 'block';	
	} else {
		object.style.display = 'none';	
	}
	
	last_toggle_id = id;	
}

function togglex(id){
  // get the element
	  var element = document.getElementById(id);
  
	if(isset(last_toggle_id)){
		if(last_toggle_id != id){
			if(getid(last_toggle_id).style.display == "block"){
				getid(last_toggle_id).style.display = "none";
			}
		}
	}
  
	if(element.style.display != 'block'){
		element.style.display = 'block';
	} else {
		element.style.display = 'none';
	}
	
	function onClickOut(){
		element.style.display = 'none';
	}
	
	// event handlers
	stopEvent("onclick", element.parentNode);
	addEvent(document.documentElement, "onclick", onClickOut, true);
	
	last_toggle_id = id;
}

function toggelFocus(id, focusID){
	togglex(id);
	getid(focusID).focus();
}

function ajax(url, whenDone){
	request = new XMLHttpRequest();
	
	request.onreadystatechange = function(){
		if(request.readyState == 4){
			if(request.status == 200){
				whenDone(request.response);
			   }
		}	
	}
	
	request.open("post", url, true);
	request.send();
}

function validEmail(email) {
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}

function hasClass(ele,cls) {
	  return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
}

function addClass(ele,cls) {
	var element = getid(ele);
	if(element){
		if (!hasClass(element,cls)) element.className += " "+cls;
	}
}

function removeClass(ele,cls) {	
	var element = getid(ele);
	if(element){
		if (hasClass(element,cls)) {
			var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
			element.className = element.className.replace(reg,' ');
		}
	}
}

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}
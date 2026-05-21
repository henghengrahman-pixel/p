document.addEventListener('input', function(e){
  if(e.target.classList.contains('html-editor')){
    e.target.style.minHeight = Math.min(700, Math.max(320, e.target.scrollHeight)) + 'px';
  }
});

const story = document.getElementById('story');
const oven = document.getElementById('oven');
function updateStoryEntry() {
  const entered = oven.dataset.view === 'inside';
  story.hidden = !entered;
  story.inert = !entered;
}
new MutationObserver(updateStoryEntry).observe(oven,{attributes:true,attributeFilter:['data-view']});
updateStoryEntry();

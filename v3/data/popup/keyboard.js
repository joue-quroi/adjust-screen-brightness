// coarse step on Shift key
document.getElementById('day-range').addEventListener('keydown', e => {
  e.target.setAttribute('step', e.shiftKey ? '0.05' : '0.01');
});
document.getElementById('day-range').addEventListener('mousedown', e => {
  e.target.setAttribute('step', e.shiftKey ? '0.05' : '0.01');
});
document.getElementById('night-range').addEventListener('keydown', e => {
  e.target.setAttribute('step', e.shiftKey ? '0.05' : '0.01');
});
document.getElementById('night-range').addEventListener('mousedown', e => {
  e.target.setAttribute('step', e.shiftKey ? '0.05' : '0.01');
});
document.addEventListener('keydown', e => {
  const meta = e.ctrlKey || e.metaKey;

  if (meta && e.code === 'KeyE') {
    e.preventDefault();
    document.getElementById('enable').click();
  }
  else if (meta && e.code === 'KeyD') {
    e.preventDefault();
    document.getElementById('disable').click();
  }
});

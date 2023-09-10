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
    e.stopPropagation();
    document.getElementById('enable').click();
  }
  else if (meta && e.code === 'KeyD') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('disable').click();
  }
  else if (meta && e.code === 'KeyT') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('switch').click();
  }
  else if (meta && e.code === 'KeyW') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('global').click();
  }
  else if (meta && e.code === 'KeyH') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('hostname').click();
  }
  else if (meta && e.code === 'KeyL') {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('lock').click();
  }
});

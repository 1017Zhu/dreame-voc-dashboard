let openSelect;
let selectId = 0;

function syncSelects() {
 for (const select of document.querySelectorAll('select:not([multiple])')) {
  let control = select.nextElementSibling;
  if (!control?.classList.contains('soft-select')) {
   control = document.createElement('span');
   control.className = 'soft-select';
   const id = 'select-options-'+(++selectId);
   const name = select.getAttribute('aria-label') ||
    (select.labels?.[0]?.querySelector('span')?.textContent) ||
    (select.dataset.task ? '行动状态' : select.options[0]?.textContent) || '选项';
   control.innerHTML = '<button type="button" class="soft-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+id+'"><span></span><i aria-hidden="true"></i></button>'
    +'<span class="soft-options" id="'+id+'" role="listbox" popover="auto"></span>';
   const trigger = control.querySelector('button');
   const menu = control.querySelector('.soft-options');
   menu.setAttribute('aria-label',name);
   trigger.addEventListener('click',event=>{
    event.preventDefault();
    if(menu.matches(':popover-open')) menu.hidePopover();
    else openMenu();
   });
   function openMenu() {
    if(openSelect && openSelect!==menu && openSelect.matches(':popover-open')) openSelect.hidePopover();
    menu.replaceChildren(...[...select.options].map(option=>{
     const button = document.createElement('button');
     button.type = 'button';
     button.role = 'option';
     button.disabled = option.disabled;
     button.setAttribute('aria-selected',String(option.selected));
     button.textContent = option.textContent;
     button.addEventListener('click',event=>{
      event.preventDefault();
      menu.hidePopover();
      select.value = option.value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      syncSelects();
      const replacement = select.id && document.getElementById(select.id);
      (replacement?.nextElementSibling?.querySelector('.soft-trigger') || trigger).focus();
     });
     return button;
    }));
    menu.showPopover();
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(innerWidth-16,Math.max(rect.width,170));
    menu.style.width = width+'px';
    menu.style.left = Math.max(8,Math.min(rect.left,innerWidth-width-8))+'px';
    const below = innerHeight-rect.bottom-12;
    const above = rect.top-12;
    const upwards = below < Math.min(menu.scrollHeight,260) && above > below;
    const height = Math.max(48,Math.min(260,upwards?above:below));
    menu.style.maxHeight = height+'px';
    menu.style.top = (upwards?Math.max(8,rect.top-menu.offsetHeight-6):rect.bottom+6)+'px';
    openSelect = menu;
    trigger.setAttribute('aria-expanded','true');
    (menu.querySelector('[aria-selected="true"]:not(:disabled)') || menu.querySelector('button:not(:disabled)'))?.focus();
   }
   menu.addEventListener('toggle',()=>{
    if(!menu.matches(':popover-open')){
     trigger.setAttribute('aria-expanded','false');
     if(openSelect===menu) openSelect=null;
    }
   });
   trigger.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openMenu();}
   });
   menu.addEventListener('keydown',event=>{
    const options = [...menu.querySelectorAll('button:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();menu.hidePopover();trigger.focus();return;}
    if(event.key==='Tab'){menu.hidePopover();trigger.focus();return;}
    const next = {ArrowDown:Math.min(index+1,options.length-1),ArrowUp:Math.max(index-1,0),Home:0,End:options.length-1}[event.key];
    if(next!==undefined){event.preventDefault();options[next]?.focus();}
   });
   control.dataset.name = name;
   select.after(control);
   select.hidden = true;
  }
  const trigger = control.querySelector('.soft-trigger');
  const value = select.selectedOptions[0]?.textContent || '';
  trigger.querySelector('span').textContent = value;
  trigger.setAttribute('aria-label',control.dataset.name+' · '+value);
  trigger.disabled = select.disabled;
 }
}

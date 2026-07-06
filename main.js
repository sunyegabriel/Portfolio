const observer = new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting)entry.target.classList.add('visible')}),{threshold:.08});
document.querySelectorAll('.reveal').forEach((el)=>observer.observe(el));

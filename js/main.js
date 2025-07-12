document.addEventListener('DOMContentLoaded', function() {
    // Theme switcher initialization
    const themeSwitch = document.querySelectorAll('.theme-switch');
    const themeIcons = document.querySelectorAll('.theme-switch i');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcons.forEach(icon => {
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });

    // Theme switch event listeners
    themeSwitch.forEach(button => {
        button.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            themeIcons.forEach(icon => {
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            });
        });
    });

    // Typewriter initialization
    var txt = ['Coding', 'Java', 'Gym', 'Wine & Beer', 'Arduino', 'Tennis', 'Soccer'];
    var app = document.getElementById('typewriter');

    var typewriter = new Typewriter(app, {
        loop: true,
        strings: txt,
        autoStart: true
    });

    // Age calculation
    let birthday = new Date("July 08, 1984").getFullYear();
    let thisYear = new Date().getFullYear();
    $("#about-text").text(function (_, ctx) {
        return ctx.replace("{{age}}", thisYear-birthday);
    });
});

function initTypewriter() {
    var txt = ['Coding', 'AI', 'Design', 'Wine & Beer', 'Arduino', 'Tennis', 'Soccer'];
    var app = document.getElementById('typewriter');
    if (!app) return;

    var typewriter = new Typewriter(app, {
        loop: true,
        strings: txt,
        autoStart: true
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Load footer content
    fetch('footer.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('footer').innerHTML = html;
            // Initialize typewriter after footer is loaded
            setTimeout(initTypewriter, 100); // Small delay to ensure DOM is updated
        })
        .catch(error => console.error('Error loading footer:', error));
});

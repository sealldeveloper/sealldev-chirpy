function toggleNinetiesMode() {
    document.body.classList.toggle('nineties-mode');
    
    if(document.body.classList.contains('nineties-mode')) {
        document.cookie = "ninetiesMode=true; path=/; max-age=31536000";
    } else {
        document.cookie = "ninetiesMode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    
    if(document.body.classList.contains('nineties-mode')) {
        preloadImages();
    }
}

function preloadImages() {
    const iconPaths = [
        '/images/90s/home-old.png',
        '/images/90s/categories-old.png',
        '/images/90s/tags-old.png',
        '/images/90s/archives-old.png',
        '/images/90s/about-old.png',
        '/images/90s/twitter-old.png',
        '/images/90s/github-old.png',
        '/images/90s/linkedin-old.png',
        '/images/90s/search-old.png',
        '/images/90s/scroll-top.png'
    ];
    
    iconPaths.forEach(path => {
        const img = new Image();
        img.src = path;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Check cookie first
    const cookies = document.cookie.split(';');
    const ninetiesMode = cookies.find(cookie => cookie.trim().startsWith('ninetiesMode='));
    
    if(ninetiesMode) {
        document.body.classList.add('nineties-mode');
        preloadImages();
    }

    // Check if URL contains '/posts/'
    if (window.location.pathname.includes('/posts/')) {
        const shareWrapper = document.querySelector('.share-wrapper');
        if (shareWrapper) {
            shareWrapper.remove();
        }
    }

    // Add button
    const navList = document.querySelector('#sidebar .nav');
    const toggleButton = document.createElement('li');
    toggleButton.className = 'nav-item';
    toggleButton.style.marginBottom = '10px';
    toggleButton.innerHTML = '<button id="nineties-toggle" onclick="toggleNinetiesMode()"><marquee>click me for 90s mode</marquee></button>';
    
    const firstNavItem = navList.querySelector('.nav-item');
    firstNavItem.before(toggleButton);
});

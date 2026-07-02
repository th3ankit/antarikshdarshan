/* ==========================================================================
   ANTARIKSH DARSHAN - B2B LANDING PAGE
   Javascript Interactivity (Globe Express Card Slider & Form Logic)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. HEADER SCROLL & MOBILE NAVIGATION
    // ==========================================
    const header = document.getElementById('header');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.header__link');

    // Smooth scroll shadow header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header--scrolled');
        } else {
            header.classList.remove('header--scrolled');
        }
        updateActiveNavLink();
    });

    // Mobile Hamburger Toggle
    hamburgerBtn.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('header__nav--open');
        hamburgerBtn.classList.toggle('active');
        hamburgerBtn.setAttribute('aria-expanded', isOpen);
        
        // Prevent background scrolling while mobile menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
        
        // Animate hamburger lines
        const spans = hamburgerBtn.querySelectorAll('span');
        if (hamburgerBtn.classList.contains('active')) {
            spans[0].style.transform = 'translateY(8px) rotate(45deg)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'translateY(-8px) rotate(-45deg)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    // Close menu when clicking navigation link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('header__nav--open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = ''; // Unlock scroll
            const spans = hamburgerBtn.querySelectorAll('span');
            spans.forEach(span => span.style.transform = 'none');
            spans[1].style.opacity = '1';
        });
    });



    // Navigation active state highlight on scroll
    function updateActiveNavLink() {
        let currentSectionId = 'hero';
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.scrollY + 120; // offset

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop && scrollPosition < (section.offsetTop + section.offsetHeight)) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            if (link.classList.contains('btn')) return;
            const href = link.getAttribute('href');
            if (href === `#${currentSectionId}`) {
                link.classList.add('header__link--active');
            } else {
                link.classList.remove('header__link--active');
            }
        });
    }


    // ==========================================
    // 2. HERO SLIDER (Globe Express Timed Cards)
    // ==========================================
    const slidesDataCount = 6;
    let currentSlide = 0;
    let textTransitionTimeout = null;
    let progressInterval = null;
    const slideDuration = 6000; // 6 seconds per slide
    const progressResolution = 50; // Update progress bar every 50ms

    // Elements
    const bgSlides = document.querySelectorAll('.hero__bg-slide');
    const expLabel = document.querySelector('.hero__experience-label');
    const heroTitles = document.querySelectorAll('.hero__title');
    const heroDescriptions = document.querySelectorAll('.hero__description');
    const sliderCards = document.querySelectorAll('.slider-card');
    const sliderTrack = document.getElementById('slider-track-element');
    const heroCounter = document.getElementById('hero-counter-element');
    const progressBar = document.getElementById('hero-progress-element');
    const prevArrow = document.getElementById('prev-arrow');
    const nextArrow = document.getElementById('next-arrow');
    const discoverBtn = document.getElementById('discover-experience-btn');
    const requestProposalBtn = document.getElementById('request-proposal-btn');

    // Initial positioning
    translateSliderTrack();

    // Trigger Slider Cycle
    startSliderCycle();

    // Event listener for Card Clicks
    sliderCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            transitionToSlide(index);
        });
    });

    // Arrow controls
    prevArrow.addEventListener('click', () => {
        let prevIndex = currentSlide - 1;
        if (prevIndex < 0) prevIndex = slidesDataCount - 1;
        transitionToSlide(prevIndex);
    });

    nextArrow.addEventListener('click', () => {
        let nextIndex = currentSlide + 1;
        if (nextIndex >= slidesDataCount) nextIndex = 0;
        transitionToSlide(nextIndex);
    });

    // Scroll helper to avoid offsetParent issues (especially in relative/grid layouts)
    function smoothScrollTo(element, offset = 100, fallbackHash = null) {
        if (!element) {
            if (fallbackHash) window.location.hash = fallbackHash;
            return;
        }
        try {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const absoluteTop = rect.top + scrollTop;
            
            // Try modern smooth scrolling
            window.scrollTo({
                top: absoluteTop - offset,
                behavior: 'smooth'
            });
        } catch (err) {
            console.warn('Smooth scroll failed, falling back:', err);
            try {
                // Fallback to instant scroll
                const rect = element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo(0, rect.top + scrollTop - offset);
            } catch (fallbackErr) {
                // Ultimate fallback: standard hash navigation
                if (fallbackHash) window.location.hash = fallbackHash;
            }
        }
    }

    // Discover button anchor redirect
    if (discoverBtn) {
        discoverBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = `exp-detail-${currentSlide}`;
            const targetElement = document.getElementById(targetId);
            smoothScrollTo(targetElement, 100, `#${targetId}`);
        });
    }

    // Request proposal button smooth redirect
    if (requestProposalBtn) {
        requestProposalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById('connect');
            smoothScrollTo(targetElement, 100, '#connect');
        });
    }

    // Recalibrate layout offsets on window resize
    window.addEventListener('resize', () => {
        translateSliderTrack();
    });

    function transitionToSlide(index) {
        if (index === currentSlide) return;
        
        // Clear existing intervals and timeouts
        stopSliderCycle();
        if (textTransitionTimeout) {
            clearTimeout(textTransitionTimeout);
        }

        // Update active slide index
        currentSlide = index;

        // Transition background slides
        bgSlides.forEach((slide, i) => {
            if (i === currentSlide) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        // Transition Info Text (Title & Description) - Instant swap to prevent height collapse
        heroTitles.forEach((title, idx) => {
            if (idx === currentSlide) {
                title.classList.add('active');
            } else {
                title.classList.remove('active');
            }
        });
        heroDescriptions.forEach((desc, idx) => {
            if (idx === currentSlide) {
                desc.classList.add('active');
            } else {
                desc.classList.remove('active');
            }
        });

        // Update indicators
        expLabel.textContent = `Experience 0${currentSlide + 1}`;
        heroCounter.textContent = `0${currentSlide + 1}`;

        // Update active class on card slider track
        sliderCards.forEach((card, i) => {
            if (i === currentSlide) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Translate track horizontally (Globe Express effect)
        translateSliderTrack();

        // Restart intervals
        startSliderCycle();
    }

    function translateSliderTrack() {
        if (!sliderTrack || !sliderCards.length) return;

        // Get dynamic dimensions to adapt to responsive layout sizes
        const firstCard = sliderCards[0];
        const cardWidth = firstCard.getBoundingClientRect().width || 200;
        
        // Compute gap dynamically
        const computedStyle = window.getComputedStyle(sliderTrack);
        const gap = parseFloat(computedStyle.gap) || 24;
        
        let offset = 0;
        
        // Calculate translation based on current active card
        if (currentSlide > 0) {
            // Translate track leftwards to align active cards
            offset = -(currentSlide * (cardWidth + gap));
        }
        
        // Apply smooth transition with GPU acceleration
        sliderTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
    }

    function startSliderCycle() {
        // Reset progress bar scale instantly
        progressBar.style.transition = 'none';
        progressBar.style.transform = 'scaleX(0)';
        
        // Force layout reflow to register the scaleX(0) state
        progressBar.offsetHeight;
        
        // Transition scaleX(1) smoothly on the compositor thread
        progressBar.style.transition = `transform ${slideDuration}ms linear`;
        progressBar.style.transform = 'scaleX(1)';
        
        // Use a single low-overhead timeout instead of high-frequency setInterval
        sliderTimer = setTimeout(() => {
            let nextIndex = currentSlide + 1;
            if (nextIndex >= slidesDataCount) nextIndex = 0;
            transitionToSlide(nextIndex);
        }, slideDuration);
    }

    function stopSliderCycle() {
        clearTimeout(sliderTimer);
        progressBar.style.transition = 'none';
        progressBar.style.transform = 'scaleX(0)';
    }


    // ==========================================
    // 3. TESTIMONIALS SLIDER
    // ==========================================
    const testSlides = document.querySelectorAll('.test-slide');
    const testDots = document.querySelectorAll('.test-dot');
    let currentTestimonial = 0;
    let testimonialInterval = null;
    const testimonialDuration = 8000; // Rotate every 8 seconds

    startTestimonialCycle();

    testDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showTestimonial(index);
        });
    });

    function showTestimonial(index) {
        if (index === currentTestimonial) return;
        
        // Stop cycle
        clearInterval(testimonialInterval);

        // Update active class
        testSlides[currentTestimonial].classList.remove('active');
        testDots[currentTestimonial].classList.remove('active');
        
        currentTestimonial = index;

        testSlides[currentTestimonial].classList.add('active');
        testDots[currentTestimonial].classList.add('active');

        // Restart cycle
        startTestimonialCycle();
    }

    function startTestimonialCycle() {
        testimonialInterval = setInterval(() => {
            let nextIndex = currentTestimonial + 1;
            if (nextIndex >= testSlides.length) nextIndex = 0;
            
            testSlides[currentTestimonial].classList.remove('active');
            testDots[currentTestimonial].classList.remove('active');
            
            currentTestimonial = nextIndex;
            
            testSlides[currentTestimonial].classList.add('active');
            testDots[currentTestimonial].classList.add('active');
        }, testimonialDuration);
    }


    // ==========================================
    // 4. B2B RFP INQUIRY FORM HANDLING
    // ==========================================
    const rfpForm = document.getElementById('rfp-partnership-form');
    const successBox = document.getElementById('rfp-form-success');
    const formCard = document.getElementById('rfp-form-card');

    // Check if redirect query parameter is present (after successful submission)
    if (window.location.search.includes('submitted=true')) {
        if (rfpForm && successBox) {
            rfpForm.style.display = 'none';
            successBox.style.display = 'block';
            successBox.style.opacity = '1';
            
            // Scroll to the card
            setTimeout(() => {
                const offsetPosition = formCard.offsetTop - 100;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }, 500);
        }
    }

    if (rfpForm) {
        rfpForm.addEventListener('submit', (e) => {
            // Simple validation check
            const nameInput = document.getElementById('official-name');
            const orgInput = document.getElementById('agency-name');
            const emailInput = document.getElementById('official-email');
            const phoneInput = document.getElementById('official-phone');
            const locationInput = document.getElementById('official-location');
            const redirectUrlInput = document.getElementById('form-redirect-url');
            const submitBtn = rfpForm.querySelector('.form-submit-btn');

            const nameVal = nameInput.value.trim();
            const orgVal = orgInput.value.trim();
            const emailVal = emailInput.value.trim();
            const phoneVal = phoneInput.value.trim();
            const locationVal = locationInput.value.trim();

            // Basic regex checks
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let currentLang = 'en';
            try {
                currentLang = localStorage.getItem('preferredLanguage') || 'en';
            } catch (err) {
                console.warn('Storage preference read in validation blocked:', err);
            }
            const dict = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang].contact : null;

            if (!emailRegex.test(emailVal)) {
                e.preventDefault();
                alert(dict ? dict.validation_email : 'Please enter a valid email address.');
                return;
            }

            if (phoneVal.length < 10) {
                e.preventDefault();
                alert(dict ? dict.validation_phone : 'Please enter a valid contact number.');
                return;
            }

            // Set the redirect URL to the current page with query parameter
            if (redirectUrlInput) {
                redirectUrlInput.value = window.location.origin + window.location.pathname + '?submitted=true';
            }

            // Show sending state
            submitBtn.disabled = true;
            submitBtn.textContent = dict ? dict.sending_inquiry : 'Sending Inquiry...';
        });
    }

    // ==========================================
    // 5. CASE STUDY PAGINATION
    // ==========================================
    function rebindCaseSwitcher() {
        const caseTabs = document.querySelectorAll('.case-tab');
        const caseSlides = document.querySelectorAll('.case-slide');

        if (caseTabs.length && caseSlides.length) {
            caseTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const caseIndex = parseInt(tab.getAttribute('data-case'));
                    
                    // Set active tab class
                    caseTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Set active slide class
                    caseSlides.forEach(slide => {
                        slide.classList.remove('active');
                        // Stop any video playing in inactive slides
                        const video = slide.querySelector('video');
                        if (video) {
                            video.pause();
                        }
                    });
                    
                    const activeSlide = document.getElementById(`case-slide-${caseIndex}`);
                    if (activeSlide) {
                        activeSlide.classList.add('active');
                    }
                });
            });
        }
    }

    // Bind initial static fallback case switcher
    rebindCaseSwitcher();

    // Touch Swipe Gestures for Mobile Stargazing Slider (Directional swipe filtering)
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    
    if (sliderTrack) {
        sliderTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        sliderTrack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });
    }
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Filter out swipes that are primarily vertical (page scroll gestures)
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > swipeThreshold) {
                // Swipe Left -> Next Slide
                let nextIndex = currentSlide + 1;
                if (nextIndex >= slidesDataCount) nextIndex = 0;
                transitionToSlide(nextIndex);
            } else if (-diffX > swipeThreshold) {
                // Swipe Right -> Previous Slide
                let prevIndex = currentSlide - 1;
                if (prevIndex < 0) prevIndex = slidesDataCount - 1;
                transitionToSlide(prevIndex);
            }
        }
    }

    // ==========================================
    // MULTILINGUAL INTEGRATION & TRANSLATION DESK
    // ==========================================
    const langSelect = document.getElementById('lang-select');
    
    function applyTranslations(lang) {
        if (typeof translations === 'undefined' || !translations[lang]) return;
        
        const dictionary = translations[lang];
        
        // Helper to resolve nested keys (e.g. "nav.home" -> translations[lang].nav.home)
        function getTranslationValue(keyPath) {
            const keys = keyPath.split('.');
            let val = dictionary;
            for (let key of keys) {
                if (val && typeof val === 'object') {
                    val = val[key];
                } else {
                    return null;
                }
            }
            return (val !== undefined && val !== null) ? val : null;
        }
        
        // Translate inner content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n');
            const translation = getTranslationValue(keyPath);
            if (translation !== null) {
                el.innerHTML = translation;
            }
        });
        
        // Translate input placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n-placeholder');
            const translation = getTranslationValue(keyPath);
            if (translation !== null) {
                el.setAttribute('placeholder', translation);
            }
        });
        
        // Translate image alt attributes
        document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const keyPath = el.getAttribute('data-i18n-alt');
            const translation = getTranslationValue(keyPath);
            if (translation !== null) {
                el.setAttribute('alt', translation);
            }
        });

        // Set document title
        if (dictionary.title) {
            document.title = dictionary.title;
        }

        // Apply RTL layout support if Urdu is selected
        if (lang === 'ur') {
            document.body.classList.add('rtl-layout');
            document.body.setAttribute('dir', 'rtl');
        } else {
            document.body.classList.remove('rtl-layout');
            document.body.removeAttribute('dir');
        }
        
        // Re-render dynamic campaigns & gallery in the target language if database loaded
        if (window.dynamicCampaigns && window.dynamicCampaigns.length) {
            renderDynamicCampaigns(window.dynamicCampaigns, lang);
        }
        if (window.dynamicGalleryItems && window.dynamicGalleryItems.length) {
            renderDynamicGallery(window.dynamicGalleryItems, lang);
        }
        
        // Trigger resize event to recalculate card slider offsets dynamically
        window.dispatchEvent(new Event('resize'));
    }
    
    // Language dropdown change handler
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            const selectedLang = e.target.value;
            try {
                localStorage.setItem('preferredLanguage', selectedLang);
            } catch (err) {
                console.warn('Storage preference save blocked:', err);
            }
            applyTranslations(selectedLang);
        });
        
        // Check for saved user preference, default to English
        let savedLang = 'en';
        try {
            savedLang = localStorage.getItem('preferredLanguage') || 'en';
        } catch (err) {
            console.warn('Storage preference read blocked:', err);
        }
        langSelect.value = savedLang;
        applyTranslations(savedLang);
    }

    // ==========================================
    // 6. FIREBASE DYNAMIC CONTENT LOADER
    // ==========================================
    window.dynamicCampaigns = null;
    window.dynamicGalleryItems = null;

    function renderDynamicCampaigns(campaigns, lang = 'en') {
        const tabsContainer = document.getElementById("case-study-tabs-container");
        const slidesContainer = document.getElementById("case-study-slides-container");
        if (!tabsContainer || !slidesContainer) return;
        
        let activeTabIdx = 0;
        const currentActiveTab = tabsContainer.querySelector(".case-tab.active");
        if (currentActiveTab) {
            activeTabIdx = parseInt(currentActiveTab.getAttribute("data-case")) || 0;
        }
        if (activeTabIdx >= campaigns.length) {
            activeTabIdx = 0;
        }
        
        tabsContainer.innerHTML = "";
        slidesContainer.innerHTML = "";
        
        campaigns.forEach((campaign, idx) => {
            const isActive = idx === activeTabIdx;
            
            const getField = (fieldObj, fallbackVal = "") => {
                if (!fieldObj) return fallbackVal;
                if (typeof fieldObj === 'string') return fieldObj;
                return fieldObj[lang] || fieldObj['en'] || fallbackVal;
            };
            
            const tabBtn = document.createElement("button");
            tabBtn.className = `case-tab ${isActive ? 'active' : ''}`;
            tabBtn.setAttribute("data-case", idx);
            tabBtn.textContent = getField(campaign.tabTitle) || getField(campaign.title);
            tabsContainer.appendChild(tabBtn);
            
            const slideGrid = document.createElement("div");
            slideGrid.className = `case-grid case-slide ${isActive ? 'active' : ''}`;
            slideGrid.id = `case-slide-${idx}`;
            
            let mediaHtml = "";
            if (campaign.videoUrl) {
                mediaHtml = `
                    <div class="case-video-wrap" style="margin-bottom: 3rem; border: 1px solid rgba(27, 38, 79, 0.12); padding: 0.75rem; background-color: var(--clr-heritage-cream-dark); border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                        <video controls ${campaign.imageUrls && campaign.imageUrls[0] ? `poster="${campaign.imageUrls[0]}"` : ''} style="width: 100%; border-radius: 2px; display: block; outline: none;">
                            <source src="${campaign.videoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div class="case-img-caption" style="margin-top: 0.75rem; font-weight: 600; font-size: 0.8rem; color: var(--clr-text-dark-muted); text-align: center;">
                            ${getField(campaign.videoCaption) || getField(campaign.title)}
                        </div>
                    </div>
                `;
            }
            
            let imagesHtml = "";
            if (campaign.imageUrls && campaign.imageUrls.length) {
                imagesHtml = `<div class="case-images">`;
                const displayImages = campaign.imageUrls.slice(0, 2);
                displayImages.forEach((imgUrl, imgIdx) => {
                    const captionObj = campaign.imageCaptions ? campaign.imageCaptions[imgIdx] : null;
                    const altText = getField(captionObj) || getField(campaign.title);
                    imagesHtml += `
                        <div class="case-img-wrap">
                            <img src="${imgUrl}" alt="${altText}">
                            <div class="case-img-caption">
                                ${getField(captionObj)}
                            </div>
                        </div>
                    `;
                });
                imagesHtml += `</div>`;
            }
            
            slideGrid.innerHTML = `
                <div class="case-meta">
                    <span class="case-meta__badge">${getField(campaign.badge) || 'Campaign'}</span>
                    <h2 class="case-meta__title">${getField(campaign.title)}</h2>
                    <p class="case-meta__desc" style="font-size: 1.15rem; line-height: 1.6; color: var(--clr-text-dark-muted);">${getField(campaign.desc)}</p>
                    
                    <div class="case-meta__stats">
                        <div class="case-stat">
                            <div class="case-stat__number">${getField(campaign.statVal1)}</div>
                            <div class="case-stat__label">${getField(campaign.statLabel1)}</div>
                        </div>
                        <div class="case-stat">
                            <div class="case-stat__number">${getField(campaign.statVal2)}</div>
                            <div class="case-stat__label">${getField(campaign.statLabel2)}</div>
                        </div>
                    </div>
                </div>

                <div class="case-content">
                    <p>${getField(campaign.paragraph1)}</p>
                    <p>${getField(campaign.paragraph2)}</p>
                    ${mediaHtml}
                    <p>${getField(campaign.paragraph3)}</p>
                    ${imagesHtml}
                </div>
            `;
            slidesContainer.appendChild(slideGrid);
        });
        
        rebindCaseSwitcher();
    }

    function renderDynamicGallery(galleryItems, lang = 'en') {
        const gridContainer = document.getElementById("gallery-grid-container");
        if (!gridContainer) return;
        
        gridContainer.innerHTML = "";
        
        galleryItems.forEach((item) => {
            const getField = (fieldObj, fallbackVal = "") => {
                if (!fieldObj) return fallbackVal;
                if (typeof fieldObj === 'string') return fieldObj;
                return fieldObj[lang] || fieldObj['en'] || fallbackVal;
            };
            
            const titleText = getField(item.title);
            const locationText = getField(item.location);
            
            const cell = document.createElement("div");
            cell.className = "gallery-item";
            cell.innerHTML = `
                <img src="${item.imageUrl}" alt="${titleText}">
                <div class="gallery-item__overlay">
                    <div>
                        <h4 class="gallery-item__title">${titleText}</h4>
                        <span class="gallery-item__loc">${locationText}</span>
                    </div>
                </div>
            `;
            gridContainer.appendChild(cell);
        });
    }

    // Load data from Firestore if configured
    function loadDynamicData(db) {
        db.collection("campaigns").orderBy("order", "asc").get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const campaigns = [];
                querySnapshot.forEach((doc) => {
                    campaigns.push({ id: doc.id, ...doc.data() });
                });
                window.dynamicCampaigns = campaigns;
                const currentLang = langSelect ? langSelect.value : 'en';
                renderDynamicCampaigns(campaigns, currentLang);
            }
        }).catch((err) => {
            console.error("Error loading dynamic campaigns:", err);
        });

        db.collection("gallery").orderBy("createdAt", "desc").get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const items = [];
                querySnapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                window.dynamicGalleryItems = items;
                const currentLang = langSelect ? langSelect.value : 'en';
                renderDynamicGallery(items, currentLang);
            }
        }).catch((err) => {
            console.error("Error loading dynamic gallery:", err);
        });
    }

    // Initialize Firebase if configured
    if (typeof firebase !== 'undefined' && window.isFirebaseConfigured) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            const db = firebase.firestore();
            loadDynamicData(db);
        } catch (err) {
            console.error("Failed to initialize Firebase database client:", err);
        }
    }
});

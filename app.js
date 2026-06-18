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

    // Prevent iOS background scroll bounce when menu is open
    navMenu.addEventListener('touchmove', (e) => {
        if (navMenu.classList.contains('header__nav--open')) {
            e.preventDefault();
        }
    }, { passive: false });

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

    // Discover button anchor redirect
    discoverBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = `exp-detail-${currentSlide}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            const offsetPosition = targetElement.offsetTop - 100;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });

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

    if (rfpForm) {
        rfpForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Simple validation check
            const nameInput = document.getElementById('official-name');
            const orgInput = document.getElementById('agency-name');
            const emailInput = document.getElementById('official-email');
            const phoneInput = document.getElementById('official-phone');
            const locationInput = document.getElementById('official-location');
            const submitBtn = rfpForm.querySelector('.form-submit-btn');

            const nameVal = nameInput.value.trim();
            const orgVal = orgInput.value.trim();
            const emailVal = emailInput.value.trim();
            const phoneVal = phoneInput.value.trim();
            const locationVal = locationInput.value.trim();

            // Basic regex checks
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                alert('Please enter a valid email address.');
                return;
            }

            if (phoneVal.length < 10) {
                alert('Please enter a valid contact number.');
                return;
            }

            // Show loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending Inquiry...';

            // Submit using FormSubmit.co AJAX endpoint
            fetch('https://formsubmit.co/ajax/dirpp@space-foundation.org', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    Name: nameVal,
                    Organisation: orgVal,
                    Email: emailVal,
                    Phone: phoneVal,
                    Location: locationVal,
                    _subject: 'New Astro Tourism Partnership Inquiry',
                    _template: 'table',
                    _captcha: 'false'
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Animate transition to success card
                rfpForm.style.transition = 'opacity 0.3s ease';
                rfpForm.style.opacity = '0';

                setTimeout(() => {
                    rfpForm.style.display = 'none';
                    successBox.style.display = 'block';
                    successBox.style.opacity = '0';
                    
                    // Trigger scroll offset alignment to success card
                    const offsetPosition = formCard.offsetTop - 100;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    setTimeout(() => {
                        successBox.style.transition = 'opacity 0.5s ease';
                        successBox.style.opacity = '1';
                    }, 50);
                }, 300);
            })
            .catch(error => {
                console.error('Submission error:', error);
                alert('There was an error submitting the form. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            });
        });
    }

    // ==========================================
    // 5. CASE STUDY PAGINATION
    // ==========================================
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
});

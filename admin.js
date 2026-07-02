/* ==========================================================================
   ANTARIKSH DARSHAN - ADMIN PORTAL SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const loginWrapper = document.getElementById('login-wrapper');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderText = document.getElementById('loader-text');
    const tabButtons = document.querySelectorAll('.admin-menu-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    const languages = ['hi', 'mr', 'te', 'ta', 'kn', 'pa', 'ur'];
    let db = null;
    let storage = null;
    let currentAuthUser = null;

    // Helper states for uploads
    let uploadedCampaignImageUrls = [];
    let uploadedCampaignImageCaptions = [];
    let galleryFile = null;

    // ==========================================
    // 1. INITIALIZE FIREBASE & SETUP UI
    // ==========================================
    
    // Check if configuration exists
    if (typeof firebase === 'undefined' || !window.isFirebaseConfigured) {
        showConfigError();
        hideLoader();
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }
        db = firebase.firestore();
        storage = firebase.storage();
        
        // Listen to Auth State
        firebase.auth().onAuthStateChanged((user) => {
            currentAuthUser = user;
            if (user) {
                // User is signed in
                loginWrapper.style.display = 'none';
                dashboardWrapper.style.display = 'block';
                logoutBtn.style.display = 'block';
                
                // Load lists
                loadCampaigns();
                loadGallery();
            } else {
                // User is signed out
                loginWrapper.style.display = 'flex';
                dashboardWrapper.style.display = 'none';
                logoutBtn.style.display = 'none';
            }
            hideLoader();
        });
    } catch (err) {
        console.error("Firebase init failed in admin portal:", err);
        alert("Firebase initialization failed. Please verify your config settings.");
        hideLoader();
    }

    // Programmatically populate input boxes for other Indic languages to avoid code duplication in admin.html
    populateMultilingualPanels();

    // ==========================================
    // 2. AUTHENTICATION HANDLERS
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            showLoader("Signing you in...");
            
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    loginForm.reset();
                })
                .catch((error) => {
                    console.error("Login failed:", error);
                    alert("Authentication failed: " + error.message);
                    hideLoader();
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                showLoader("Signing you out...");
                firebase.auth().signOut()
                    .catch((err) => {
                        console.error("Sign out failed:", err);
                        hideLoader();
                    });
            }
        });
    }

    // ==========================================
    // 3. TAB CONTROLLER
    // ==========================================
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetTab = btn.getAttribute('data-tab');
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    });

    // Language tabs toggler (handles EN and Indic languages sub-tabs inside campaign and gallery forms)
    document.body.addEventListener('click', (e) => {
        const langTab = e.target.closest('.admin-lang-tab');
        if (langTab) {
            const form = langTab.closest('form');
            const targetLang = langTab.getAttribute('data-lang');
            
            // Set tabs active
            form.querySelectorAll('.admin-lang-tab').forEach(t => t.classList.remove('active'));
            langTab.classList.add('active');
            
            // Set content active
            form.querySelectorAll('.admin-lang-content').forEach(c => {
                if (c.getAttribute('data-lang-panel') === targetLang) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });
        }
    });

    // ==========================================
    // 4. CAMPAIGN MANAGEMENT (CRUD)
    // ==========================================
    const campaignForm = document.getElementById('campaign-form');
    const campaignsList = document.getElementById('campaigns-list');
    const cancelCampaignBtn = document.getElementById('cancel-campaign-btn');
    const campaignFormTitle = document.getElementById('campaign-form-title');
    
    // File inputs
    const campDropzone = document.getElementById('campaign-dropzone');
    const campFileInput = document.getElementById('campaign-file-input');
    const campPreviews = document.getElementById('campaign-images-previews');

    // Drag-and-drop triggers for Campaign Images
    if (campDropzone && campFileInput) {
        campDropzone.addEventListener('click', () => campFileInput.click());
        campDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            campDropzone.classList.add('dragover');
        });
        campDropzone.addEventListener('dragleave', () => {
            campDropzone.classList.remove('dragover');
        });
        campDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            campDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleCampaignFiles(e.dataTransfer.files);
            }
        });
        campFileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleCampaignFiles(e.target.files);
            }
        });
    }

    function handleCampaignFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert("Only image files are allowed.");
                return;
            }
            if (uploadedCampaignImageUrls.length >= 2) {
                alert("You can upload a maximum of 2 images per campaign.");
                return;
            }

            const fileId = Date.now() + '_' + Math.random().toString(36).substring(2, 5);
            showLoader(`Uploading ${file.name}...`);

            // Upload directly to Firebase Storage
            const storageRef = storage.ref(`campaigns/${fileId}_${file.name}`);
            storageRef.put(file)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => {
                    uploadedCampaignImageUrls.push(downloadURL);
                    uploadedCampaignImageCaptions.push(file.name.replace(/\.[^/.]+$/, ""));
                    renderCampaignImagePreviews();
                    hideLoader();
                })
                .catch(err => {
                    console.error("Upload failed:", err);
                    alert("Failed to upload image: " + err.message);
                    hideLoader();
                });
        });
    }

    function renderCampaignImagePreviews() {
        campPreviews.innerHTML = "";
        uploadedCampaignImageUrls.forEach((url, idx) => {
            const caption = uploadedCampaignImageCaptions[idx] || "";
            const div = document.createElement('div');
            div.className = 'admin-file-preview';
            div.innerHTML = `
                <img src="${url}" alt="Preview">
                <div class="admin-file-preview__info">
                    <div class="admin-file-preview__name">${url.substring(url.lastIndexOf('%2F') + 3, url.indexOf('?'))}</div>
                    <input type="text" class="admin-input" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; margin-top: 0.35rem;" placeholder="Image Caption (e.g. Students in Dome)" value="${caption}" data-img-idx="${idx}">
                </div>
                <button type="button" class="admin-file-preview__remove" data-img-idx="${idx}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            
            // Listen to caption changes
            div.querySelector('input').addEventListener('input', (e) => {
                const imgIdx = parseInt(e.target.getAttribute('data-img-idx'));
                uploadedCampaignImageCaptions[imgIdx] = e.target.value;
            });

            // Listen to remove
            div.querySelector('.admin-file-preview__remove').addEventListener('click', () => {
                uploadedCampaignImageUrls.splice(idx, 1);
                uploadedCampaignImageCaptions.splice(idx, 1);
                renderCampaignImagePreviews();
            });

            campPreviews.appendChild(div);
        });
    }

    // Submit Campaign
    if (campaignForm) {
        campaignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const campId = document.getElementById('campaign-id').value;
            const order = parseInt(document.getElementById('camp-order').value) || 1;
            const videoUrl = document.getElementById('camp-video-url').value.trim();

            showLoader("Saving campaign data...");

            // Compile localized maps
            const titleMap = {};
            const tabTitleMap = {};
            const badgeMap = {};
            const descMap = {};
            const statVal1Map = {};
            const statLabel1Map = {};
            const statVal2Map = {};
            const statLabel2Map = {};
            const paragraph1Map = {};
            const paragraph2Map = {};
            const videoCaptionMap = {};
            const paragraph3Map = {};

            // Fetch English
            titleMap['en'] = document.getElementById('camp-title-en').value.trim();
            tabTitleMap['en'] = document.getElementById('camp-tabTitle-en').value.trim();
            badgeMap['en'] = document.getElementById('camp-badge-en').value.trim();
            descMap['en'] = document.getElementById('camp-desc-en').value.trim();
            statVal1Map['en'] = document.getElementById('camp-statVal1-en').value.trim();
            statLabel1Map['en'] = document.getElementById('camp-statLabel1-en').value.trim();
            statVal2Map['en'] = document.getElementById('camp-statVal2-en').value.trim();
            statLabel2Map['en'] = document.getElementById('camp-statLabel2-en').value.trim();
            paragraph1Map['en'] = document.getElementById('camp-paragraph1-en').value.trim();
            paragraph2Map['en'] = document.getElementById('camp-paragraph2-en').value.trim();
            videoCaptionMap['en'] = document.getElementById('camp-videoCaption-en').value.trim();
            paragraph3Map['en'] = document.getElementById('camp-paragraph3-en').value.trim();

            // Fetch other languages
            languages.forEach(lang => {
                titleMap[lang] = document.getElementById(`camp-title-${lang}`).value.trim() || titleMap['en'];
                tabTitleMap[lang] = document.getElementById(`camp-tabTitle-${lang}`).value.trim() || tabTitleMap['en'];
                badgeMap[lang] = document.getElementById(`camp-badge-${lang}`).value.trim() || badgeMap['en'];
                descMap[lang] = document.getElementById(`camp-desc-${lang}`).value.trim() || descMap['en'];
                statVal1Map[lang] = document.getElementById(`camp-statVal1-${lang}`).value.trim() || statVal1Map['en'];
                statLabel1Map[lang] = document.getElementById(`camp-statLabel1-${lang}`).value.trim() || statLabel1Map['en'];
                statVal2Map[lang] = document.getElementById(`camp-statVal2-${lang}`).value.trim() || statVal2Map['en'];
                statLabel2Map[lang] = document.getElementById(`camp-statLabel2-${lang}`).value.trim() || statLabel2Map['en'];
                paragraph1Map[lang] = document.getElementById(`camp-paragraph1-${lang}`).value.trim() || paragraph1Map['en'];
                paragraph2Map[lang] = document.getElementById(`camp-paragraph2-${lang}`).value.trim() || paragraph2Map['en'];
                videoCaptionMap[lang] = document.getElementById(`camp-videoCaption-${lang}`).value.trim() || videoCaptionMap['en'];
                paragraph3Map[lang] = document.getElementById(`camp-paragraph3-${lang}`).value.trim() || paragraph3Map['en'];
            });

            // Localized captions for uploaded images
            const imageCaptionsMapList = [];
            uploadedCampaignImageCaptions.forEach((cap, imgIdx) => {
                const map = { en: cap };
                languages.forEach(lang => {
                    const inputEl = document.getElementById(`camp-imageCaption${imgIdx + 1}-${lang}`);
                    map[lang] = (inputEl && inputEl.value.trim()) ? inputEl.value.trim() : cap;
                });
                imageCaptionsMapList.push(map);
            });

            const campaignData = {
                order: order,
                videoUrl: videoUrl,
                imageUrls: uploadedCampaignImageUrls,
                imageCaptions: imageCaptionsMapList,
                title: titleMap,
                tabTitle: tabTitleMap,
                badge: badgeMap,
                desc: descMap,
                statVal1: statVal1Map,
                statLabel1: statLabel1Map,
                statVal2: statVal2Map,
                statLabel2: statLabel2Map,
                paragraph1: paragraph1Map,
                paragraph2: paragraph2Map,
                videoCaption: videoCaptionMap,
                paragraph3: paragraph3Map,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = campId ? db.collection("campaigns").doc(campId) : db.collection("campaigns").doc();
            
            docRef.set(campaignData, { merge: true })
                .then(() => {
                    campaignForm.reset();
                    resetCampaignFormState();
                    loadCampaigns();
                    alert("Campaign saved successfully!");
                })
                .catch(err => {
                    console.error("Save failed:", err);
                    alert("Failed to save campaign: " + err.message);
                    hideLoader();
                });
        });
    }

    function resetCampaignFormState() {
        document.getElementById('campaign-id').value = "";
        campaignFormTitle.textContent = "Add New Campaign";
        cancelCampaignBtn.style.display = 'none';
        uploadedCampaignImageUrls = [];
        uploadedCampaignImageCaptions = [];
        campPreviews.innerHTML = "";
        
        // Reset language tabs
        campaignForm.querySelectorAll('.admin-lang-tab').forEach(t => t.classList.remove('active'));
        campaignForm.querySelector('.admin-lang-tab[data-lang="en"]').classList.add('active');
        campaignForm.querySelectorAll('.admin-lang-content').forEach(c => c.classList.remove('active'));
        campaignForm.querySelector('.admin-lang-content[data-lang-panel="en"]').classList.add('active');
    }

    if (cancelCampaignBtn) {
        cancelCampaignBtn.addEventListener('click', resetCampaignFormState);
    }

    // Load campaigns list
    function loadCampaigns() {
        db.collection("campaigns").orderBy("order", "asc").get()
            .then(querySnapshot => {
                campaignsList.innerHTML = "";
                if (querySnapshot.empty) {
                    campaignsList.innerHTML = `<div style="color: var(--clr-text-muted); text-align: center; padding: 2rem;">No campaigns found.</div>`;
                    return;
                }

                querySnapshot.forEach(doc => {
                    const campaign = doc.data();
                    const titleText = campaign.title && campaign.title.en ? campaign.title.en : "Untitled";
                    const subtitleText = campaign.badge && campaign.badge.en ? campaign.badge.en : "Campaign";
                    const thumbUrl = campaign.imageUrls && campaign.imageUrls[0] ? campaign.imageUrls[0] : "assets/placeholder-thumbnail.jpg";

                    const row = document.createElement('div');
                    row.className = 'admin-item-row';
                    row.innerHTML = `
                        <div class="admin-item-info">
                            <img src="${thumbUrl}" class="admin-item-thumb" alt="">
                            <div class="admin-item-meta">
                                <div class="admin-item-title">${titleText}</div>
                                <div class="admin-item-subtitle">Order: ${campaign.order} • ${subtitleText}</div>
                            </div>
                        </div>
                        <div class="admin-item-actions">
                            <button type="button" class="admin-action-btn admin-action-btn--edit" data-id="${doc.id}">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                            <button type="button" class="admin-action-btn admin-action-btn--delete" data-id="${doc.id}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;

                    // Edit Action
                    row.querySelector('.admin-action-btn--edit').addEventListener('click', () => {
                        editCampaign(doc.id, campaign);
                    });

                    // Delete Action
                    row.querySelector('.admin-action-btn--delete').addEventListener('click', () => {
                        if (confirm(`Are you sure you want to delete the campaign "${titleText}"?`)) {
                            showLoader("Deleting campaign...");
                            db.collection("campaigns").doc(doc.id).delete()
                                .then(() => {
                                    loadCampaigns();
                                    alert("Campaign deleted successfully.");
                                })
                                .catch(err => {
                                    console.error("Delete failed:", err);
                                    alert("Failed to delete campaign: " + err.message);
                                    hideLoader();
                                });
                        }
                    });

                    campaignsList.appendChild(row);
                });
            })
            .catch(err => {
                console.error("Failed to load campaigns:", err);
            });
    }

    function editCampaign(id, campaign) {
        document.getElementById('campaign-id').value = id;
        document.getElementById('camp-order').value = campaign.order || 1;
        document.getElementById('camp-video-url').value = campaign.videoUrl || "";

        campaignFormTitle.textContent = "Edit Campaign: " + (campaign.title.en || "");
        cancelCampaignBtn.style.display = 'inline-block';

        // Load English fields
        document.getElementById('camp-title-en').value = campaign.title.en || "";
        document.getElementById('camp-tabTitle-en').value = campaign.tabTitle.en || "";
        document.getElementById('camp-badge-en').value = campaign.badge.en || "";
        document.getElementById('camp-desc-en').value = campaign.desc.en || "";
        document.getElementById('camp-statVal1-en').value = campaign.statVal1.en || "";
        document.getElementById('camp-statLabel1-en').value = campaign.statLabel1.en || "";
        document.getElementById('camp-statVal2-en').value = campaign.statVal2.en || "";
        document.getElementById('camp-statLabel2-en').value = campaign.statLabel2.en || "";
        document.getElementById('camp-paragraph1-en').value = campaign.paragraph1.en || "";
        document.getElementById('camp-paragraph2-en').value = campaign.paragraph2.en || "";
        document.getElementById('camp-videoCaption-en').value = campaign.videoCaption.en || "";
        document.getElementById('camp-paragraph3-en').value = campaign.paragraph3.en || "";

        // Load other languages
        languages.forEach(lang => {
            document.getElementById(`camp-title-${lang}`).value = (campaign.title && campaign.title[lang]) ? campaign.title[lang] : "";
            document.getElementById(`camp-tabTitle-${lang}`).value = (campaign.tabTitle && campaign.tabTitle[lang]) ? campaign.tabTitle[lang] : "";
            document.getElementById(`camp-badge-${lang}`).value = (campaign.badge && campaign.badge[lang]) ? campaign.badge[lang] : "";
            document.getElementById(`camp-desc-${lang}`).value = (campaign.desc && campaign.desc[lang]) ? campaign.desc[lang] : "";
            document.getElementById(`camp-statVal1-${lang}`).value = (campaign.statVal1 && campaign.statVal1[lang]) ? campaign.statVal1[lang] : "";
            document.getElementById(`camp-statLabel1-${lang}`).value = (campaign.statLabel1 && campaign.statLabel1[lang]) ? campaign.statLabel1[lang] : "";
            document.getElementById(`camp-statVal2-${lang}`).value = (campaign.statVal2 && campaign.statVal2[lang]) ? campaign.statVal2[lang] : "";
            document.getElementById(`camp-statLabel2-${lang}`).value = (campaign.statLabel2 && campaign.statLabel2[lang]) ? campaign.statLabel2[lang] : "";
            document.getElementById(`camp-paragraph1-${lang}`).value = (campaign.paragraph1 && campaign.paragraph1[lang]) ? campaign.paragraph1[lang] : "";
            document.getElementById(`camp-paragraph2-${lang}`).value = (campaign.paragraph2 && campaign.paragraph2[lang]) ? campaign.paragraph2[lang] : "";
            document.getElementById(`camp-videoCaption-${lang}`).value = (campaign.videoCaption && campaign.videoCaption[lang]) ? campaign.videoCaption[lang] : "";
            document.getElementById(`camp-paragraph3-${lang}`).value = (campaign.paragraph3 && campaign.paragraph3[lang]) ? campaign.paragraph3[lang] : "";
        });

        // Load images
        uploadedCampaignImageUrls = campaign.imageUrls ? [...campaign.imageUrls] : [];
        uploadedCampaignImageCaptions = [];
        uploadedCampaignImageUrls.forEach((url, imgIdx) => {
            const capMap = campaign.imageCaptions && campaign.imageCaptions[imgIdx] ? campaign.imageCaptions[imgIdx] : null;
            uploadedCampaignImageCaptions.push(capMap ? capMap.en : "");
            
            // Set localized image caption fields
            languages.forEach(lang => {
                const inputEl = document.getElementById(`camp-imageCaption${imgIdx + 1}-${lang}`);
                if (inputEl) {
                    inputEl.value = capMap ? (capMap[lang] || "") : "";
                }
            });
        });
        renderCampaignImagePreviews();

        // Scroll to form
        campaignForm.scrollIntoView({ behavior: 'smooth' });
    }

    // ==========================================
    // 5. GALLERY MANAGEMENT
    // ==========================================
    const galleryForm = document.getElementById('gallery-form');
    const galleryList = document.getElementById('gallery-list');
    const galleryDropzone = document.getElementById('gallery-dropzone');
    const galleryFileInput = document.getElementById('gallery-file-input');
    const galleryPreview = document.getElementById('gallery-image-preview');
    const galleryPreviewImg = document.getElementById('gallery-preview-img');
    const galleryPreviewName = document.getElementById('gallery-preview-name');
    const galleryPreviewSize = document.getElementById('gallery-preview-size');
    const removeGalleryPreview = document.getElementById('remove-gallery-preview');

    if (galleryDropzone && galleryFileInput) {
        galleryDropzone.addEventListener('click', () => galleryFileInput.click());
        galleryDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            galleryDropzone.classList.add('dragover');
        });
        galleryDropzone.addEventListener('dragleave', () => {
            galleryDropzone.classList.remove('dragover');
        });
        galleryDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            galleryDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                setGalleryFile(e.dataTransfer.files[0]);
            }
        });
        galleryFileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                setGalleryFile(e.target.files[0]);
            }
        });
    }

    function setGalleryFile(file) {
        if (!file.type.startsWith('image/')) {
            alert("Only images are allowed in the campaign gallery.");
            return;
        }
        galleryFile = file;
        galleryPreviewImg.src = URL.createObjectURL(file);
        galleryPreviewName.textContent = file.name;
        galleryPreviewSize.textContent = (file.size / 1024).toFixed(1) + " KB";
        galleryDropzone.style.display = 'none';
        galleryPreview.style.display = 'flex';
    }

    if (removeGalleryPreview) {
        removeGalleryPreview.addEventListener('click', () => {
            galleryFile = null;
            galleryFileInput.value = "";
            galleryDropzone.style.display = 'block';
            galleryPreview.style.display = 'none';
        });
    }

    // Submit Gallery Image
    if (galleryForm) {
        galleryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!galleryFile) {
                alert("Please select a photo to upload.");
                return;
            }

            showLoader("Uploading image and saving...");

            const titleMap = {};
            const locationMap = {};

            // Fetch English
            titleMap['en'] = document.getElementById('gal-title-en').value.trim();
            locationMap['en'] = document.getElementById('gal-location-en').value.trim();

            // Fetch other languages
            languages.forEach(lang => {
                titleMap[lang] = document.getElementById(`gal-title-${lang}`).value.trim() || titleMap['en'];
                locationMap[lang] = document.getElementById(`gal-location-${lang}`).value.trim() || locationMap['en'];
            });

            const fileId = Date.now() + '_' + Math.random().toString(36).substring(2, 5);
            const storageRef = storage.ref(`gallery/${fileId}_${galleryFile.name}`);

            storageRef.put(galleryFile)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => {
                    const galleryData = {
                        imageUrl: downloadURL,
                        imagePath: storageRef.fullPath,
                        title: titleMap,
                        location: locationMap,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    return db.collection("gallery").add(galleryData);
                })
                .then(() => {
                    galleryForm.reset();
                    galleryFile = null;
                    galleryFileInput.value = "";
                    galleryDropzone.style.display = 'block';
                    galleryPreview.style.display = 'none';
                    loadGallery();
                    alert("Photo uploaded successfully!");
                })
                .catch(err => {
                    console.error("Gallery save failed:", err);
                    alert("Failed to upload photo: " + err.message);
                    hideLoader();
                });
        });
    }

    // Load gallery items
    function loadGallery() {
        db.collection("gallery").orderBy("createdAt", "desc").get()
            .then(querySnapshot => {
                galleryList.innerHTML = "";
                if (querySnapshot.empty) {
                    galleryList.innerHTML = `<div style="color: var(--clr-text-muted); text-align: center; padding: 2rem;">No gallery photos found.</div>`;
                    return;
                }

                querySnapshot.forEach(doc => {
                    const item = doc.data();
                    const titleText = item.title && item.title.en ? item.title.en : "Untitled Image";
                    const locationText = item.location && item.location.en ? item.location.en : "";

                    const row = document.createElement('div');
                    row.className = 'admin-item-row';
                    row.innerHTML = `
                        <div class="admin-item-info">
                            <img src="${item.imageUrl}" class="admin-item-thumb" alt="">
                            <div class="admin-item-meta">
                                <div class="admin-item-title">${titleText}</div>
                                <div class="admin-item-subtitle">${locationText}</div>
                            </div>
                        </div>
                        <div class="admin-item-actions">
                            <button type="button" class="admin-action-btn admin-action-btn--delete" data-id="${doc.id}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;

                    // Delete Action
                    row.querySelector('.admin-action-btn--delete').addEventListener('click', () => {
                        if (confirm(`Are you sure you want to delete this photo from the gallery?`)) {
                            showLoader("Deleting photo...");
                            
                            // Delete from Firestore
                            db.collection("gallery").doc(doc.id).delete()
                                .then(() => {
                                    // Optionally delete file from storage if imagePath was saved
                                    if (item.imagePath) {
                                        return storage.ref(item.imagePath).delete().catch(e => console.warn("Failed to delete storage file:", e));
                                    }
                                })
                                .then(() => {
                                    loadGallery();
                                    alert("Photo deleted successfully.");
                                })
                                .catch(err => {
                                    console.error("Delete failed:", err);
                                    alert("Failed to delete photo: " + err.message);
                                    hideLoader();
                                });
                        }
                    });

                    galleryList.appendChild(row);
                });
            })
            .catch(err => {
                console.error("Failed to load gallery:", err);
            });
    }

    // ==========================================
    // 6. HELPER FUNCTIONS
    // ==========================================

    function showLoader(text = "Loading...") {
        loaderText.textContent = text;
        loaderOverlay.classList.add('active');
    }

    function hideLoader() {
        loaderOverlay.classList.remove('active');
    }

    // Populates other Indic languages copy-panel grids inside campaigns and gallery form cards programmatically to avoid raw html clutter
    function populateMultilingualPanels() {
        languages.forEach(lang => {
            const upper = lang.toUpperCase();
            
            // 1. Campaign lang panels
            const campPanel = document.querySelector(`.admin-lang-content[data-lang-panel="${lang}"]`);
            if (campPanel) {
                campPanel.innerHTML = `
                    <div class="admin-row">
                        <div class="admin-form-group">
                            <label class="admin-label">Tab Title (${upper})</label>
                            <input type="text" id="camp-tabTitle-${lang}" class="admin-input" placeholder="Localized tab title...">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-label">Badge (${upper})</label>
                            <input type="text" id="camp-badge-${lang}" class="admin-input" placeholder="Localized badge...">
                        </div>
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Campaign Title (${upper})</label>
                        <input type="text" id="camp-title-${lang}" class="admin-input" placeholder="Localized campaign title...">
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Card Subtitle Description (Hero - ${upper})</label>
                        <textarea id="camp-desc-${lang}" class="admin-input" placeholder="Localized card summary..."></textarea>
                    </div>
                    <div class="admin-row">
                        <div class="admin-form-group">
                            <label class="admin-label">Stat 1 Value (${upper})</label>
                            <input type="text" id="camp-statVal1-${lang}" class="admin-input" placeholder="Localized stat 1 value...">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-label">Stat 1 Label (${upper})</label>
                            <input type="text" id="camp-statLabel1-${lang}" class="admin-input" placeholder="Localized stat 1 label...">
                        </div>
                    </div>
                    <div class="admin-row">
                        <div class="admin-form-group">
                            <label class="admin-label">Stat 2 Value (${upper})</label>
                            <input type="text" id="camp-statVal2-${lang}" class="admin-input" placeholder="Localized stat 2 value...">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-label">Stat 2 Label (${upper})</label>
                            <input type="text" id="camp-statLabel2-${lang}" class="admin-input" placeholder="Localized stat 2 label...">
                        </div>
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Paragraph 1 (${upper})</label>
                        <textarea id="camp-paragraph1-${lang}" class="admin-input" placeholder="Localized paragraph 1..."></textarea>
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Paragraph 2 (${upper})</label>
                        <textarea id="camp-paragraph2-${lang}" class="admin-input" placeholder="Localized paragraph 2..."></textarea>
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Video Caption (${upper})</label>
                        <input type="text" id="camp-videoCaption-${lang}" class="admin-input" placeholder="Localized video caption...">
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Paragraph 3 (${upper})</label>
                        <textarea id="camp-paragraph3-${lang}" class="admin-input" placeholder="Localized paragraph 3..."></textarea>
                    </div>
                    <div class="admin-row">
                        <div class="admin-form-group">
                            <label class="admin-label">Image 1 Caption (${upper})</label>
                            <input type="text" id="camp-imageCaption1-${lang}" class="admin-input" placeholder="Localized image 1 caption...">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-label">Image 2 Caption (${upper})</label>
                            <input type="text" id="camp-imageCaption2-${lang}" class="admin-input" placeholder="Localized image 2 caption...">
                        </div>
                    </div>
                `;
            }

            // 2. Gallery lang panels
            const galPanel = document.querySelector(`#gallery-form .admin-lang-content[data-lang-panel="${lang}"]`);
            if (galPanel) {
                galPanel.innerHTML = `
                    <div class="admin-form-group">
                        <label class="admin-label">Photo Caption Title (${upper})</label>
                        <input type="text" id="gal-title-${lang}" class="admin-input" placeholder="Localized caption title...">
                    </div>
                    <div class="admin-form-group">
                        <label class="admin-label">Location Tag (${upper})</label>
                        <input type="text" id="gal-location-${lang}" class="admin-input" placeholder="Localized location tag...">
                    </div>
                `;
            }
        });
    }

    function showConfigError() {
        loginWrapper.innerHTML = `
            <div class="admin-card" style="max-width: 600px; text-align: center;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--clr-heritage-gold); margin-bottom: 1.5rem;"></i>
                <h2 class="admin-card__title">Firebase Config Missing</h2>
                <p class="admin-card__subtitle" style="margin-bottom: 1.5rem;">The connection credential file has not been set up yet.</p>
                <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); font-family: monospace; font-size: 0.85rem; line-height: 1.5; color: var(--clr-text-muted);">
                    <strong style="color: #ffffff;">To configure Firebase:</strong><br>
                    1. Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" style="color: var(--clr-heritage-gold); text-decoration: underline;">console.firebase.google.com</a><br>
                    2. Enable <strong style="color: #ffffff;">Firestore Database</strong>, <strong style="color: #ffffff;">Firebase Storage</strong>, and <strong style="color: #ffffff;">Email/Password Auth</strong>.<br>
                    3. Open the file <strong style="color: #ffffff;">firebase-config.js</strong> in your editor.<br>
                    4. Replace the placeholder values in the <code style="color: var(--clr-heritage-gold);">firebaseConfig</code> object with your project keys.
                </div>
                <a href="index.html" class="admin-btn" style="margin-top: 2rem;">
                    <i class="fa-solid fa-arrow-left"></i> Back to Main Site
                </a>
            </div>
        `;
    }
});

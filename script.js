import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const CONFIG = {
    modelPath: 'Meshy_AI_Little Green Frog Plush_1785421742_texture.stl',
    frogCount: 40,
};

class FrogRain {
    constructor() {
        this.canvas = document.getElementById('rain-canvas');
        this.container = document.getElementById('home');
        if (!this.canvas || !this.container) return;

        this.frogs = [];
        this.running = false;
        this.visible = true;

        this.init();
        this.loadModel();
    }

    init() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
        this.camera.position.set(0, 0, 22);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(6, 12, 8);
        this.scene.add(dir);

        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(-5, -3, 6);
        this.scene.add(fill);

        const back = new THREE.DirectionalLight(0xffffff, 0.3);
        back.position.set(0, 5, -8);
        this.scene.add(back);

        window.addEventListener('resize', () => this.onResize());

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    this.visible = entry.isIntersecting;
                    if (this.visible && this.running && !this._looping) {
                        this._looping = true;
                        this.animate();
                    }
                });
            },
            { threshold: 0.05 },
        );
        observer.observe(this.container);
    }

    /* ---------- Load STL then spawn frogs ---------- */
    loadModel() {
        const loader = new STLLoader();
        loader.load(
            CONFIG.modelPath,
            (geometry) => {
                geometry.computeBoundingBox();
                geometry.center();
                geometry.computeVertexNormals();

                const bbox = geometry.boundingBox;
                const maxDim = Math.max(
                    bbox.max.x - bbox.min.x,
                    bbox.max.y - bbox.min.y,
                    bbox.max.z - bbox.min.z,
                );

                // Check if STL has embedded vertex colours
                this.hasVertexColors = geometry.hasAttribute('color');

                this.spawnFrogs(geometry, maxDim);
                this.hideLoading();
                this.running = true;
                this._looping = true;
                this.animate();
            },
            undefined,
            (err) => {
                console.error('STL load error:', err);
                this.hideLoading();
            },
        );
    }
    spawnFrogs(geometry, maxDim) {
        for (let i = 0; i < CONFIG.frogCount; i++) {
            const s = ((Math.random() * 0.55 + 0.25) * 3) / maxDim;

            let mat;

            if (this.hasVertexColors) {
                mat = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    metalness: 0.05,
                    roughness: 0.5,
                });
            } else {
                const hue = 0.24 + Math.random() * 0.08;
                const sat = 0.35 + Math.random() * 0.2;
                const lit = 0.40 + Math.random() * 0.18;
                mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, sat, lit),
                    metalness: 0.05,
                    roughness: 0.5,
                });
            }

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.scale.set(s, s, s);
            mesh.rotation.x = -Math.PI / 2;
            const x = (Math.random() - 0.5) * 36;
            const y = 16 + Math.random() * 40;
            const z = (Math.random() - 0.5) * 8;
            mesh.position.set(x, y, z);

            this.frogs.push({
                mesh,
                speed: 2.5 + Math.random() * 4,
                baseSpeed: 2.5 + Math.random() * 4,
                accel: 0.5 + Math.random() * 0.7,
                rotSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3,
                ),
            });

            this.scene.add(mesh);
        }
    }

    recycleFrog(f) {
        f.mesh.position.x = (Math.random() - 0.5) * 36;
        f.mesh.position.y = 16 + Math.random() * 12;
        f.mesh.position.z = (Math.random() - 0.5) * 8;
        f.speed = 2.5 + Math.random() * 4;
        f.accel = 0.5 + Math.random() * 0.7;
        const bbox = f.mesh.geometry.boundingBox;
        const maxDim = Math.max(
            bbox.max.x - bbox.min.x,
            bbox.max.y - bbox.min.y,
            bbox.max.z - bbox.min.z,
        );
        const s = ((Math.random() * 0.55 + 0.25) * 3) / maxDim;
        f.mesh.scale.set(s, s, s);
        f.mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
        );
        f.rotSpeed.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
        );
    }

    animate() {
        if (!this.running) { this._looping = false; return; }
        // Pause rendering when hero is off-screen
        if (!this.visible) { this._looping = false; return; }

        requestAnimationFrame(() => this.animate());

        const dt = 1 / 60;

        for (const f of this.frogs) {
            f.speed += f.accel * dt;
            f.mesh.position.y -= f.speed * dt;
            f.mesh.rotation.x += f.rotSpeed.x * dt;
            f.mesh.rotation.y += f.rotSpeed.y * dt;
            f.mesh.rotation.z += f.rotSpeed.z * dt;
            if (f.mesh.position.y < -22) {
                this.recycleFrog(f);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    hideLoading() {
        const el = document.getElementById('loading-screen');
        if (el) {
            el.classList.add('loaded');
            setTimeout(() => { el.style.display = 'none'; }, 800);
        }
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}

class ParticlesBackground {
    constructor() {
        this.canvas = document.getElementById('particles-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.count = Math.min(70, Math.floor(window.innerWidth / 20));

        this.resize();
        this.create();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    create() {
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 1.4 + 0.4,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                o: Math.random() * 0.25 + 0.05,
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.count = Math.min(70, Math.floor(window.innerWidth / 20));
            this.create();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const W = this.canvas.width;
        const H = this.canvas.height;

        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -5) p.x = W + 5;
            if (p.x > W + 5) p.x = -5;
            if (p.y < -5) p.y = H + 5;
            if (p.y > H + 5) p.y = -5;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255,255,255,${p.o})`;
            this.ctx.fill();
        }
        const md = 100;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const a = this.particles[i];
                const b = this.particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < md) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - d / md)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }
}
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const navToggle = document.getElementById('nav-toggle');
    const navLinksContainer = document.getElementById('nav-links');
    const sections = document.querySelectorAll('.section[id]');

    const onScroll = () => {
        if (!navbar) return;
        navbar.classList.toggle('scrolled', window.scrollY > 50);
        let current = '';
        sections.forEach((s) => {
            if (window.scrollY >= s.offsetTop - 120) current = s.id;
        });
        navLinks.forEach((l) => {
            const href = l.getAttribute('href');
            if (href && href.startsWith('#')) {
                l.classList.toggle('active', l.dataset.section === current || href === '#' + current);
            }
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    navLinks.forEach((l) => {
        l.addEventListener('click', (e) => {
            const href = l.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetEl = document.querySelector(href);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                    navLinksContainer?.classList.remove('open');
                    navToggle?.classList.remove('open');
                }
            } else {
                navLinksContainer?.classList.remove('open');
                navToggle?.classList.remove('open');
            }
        });
    });

    navToggle?.addEventListener('click', () => {
        navLinksContainer?.classList.toggle('open');
        navToggle?.classList.toggle('open');
    });
}

function initScrollAnimations() {
    const obs = new IntersectionObserver(
        (entries) =>
            entries.forEach((e) => {
                if (e.isIntersecting) e.target.classList.add('visible');
            }),
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => obs.observe(el));
}

// ==========================================
// Experience Timeline  (chronological order — oldest first)
// ==========================================
// ┌─────────────────────────────────────────────────────────────────────┐
// │  TEMPLATE — copy an object below and fill in your details to add   │
// │  a new experience entry. Keep entries in chronological order.       │
// │                                                                     │
// │  {                                                                  │
// │      role: 'Your Role Title',                                       │
// │      org: 'Organisation Name',                                      │
// │      location: 'City, Country',                                     │
// │      dateStart: 'MM/YYYY',                                         │
// │      dateEnd: 'MM/YYYY or Now',                                     │
// │      bullets: [                                                     │
// │          'Responsibility or achievement #1',                        │
// │          'Responsibility or achievement #2',                        │
// │      ],                                                             │
// │  },                                                                 │
// └─────────────────────────────────────────────────────────────────────┘

const EXPERIENCES = [
    {
        role: 'Head of Organisation',
        org: 'Bogamis Board Game Club',
        location: 'Da Nang, Vietnam',
        dateStart: '09/2024',
        dateEnd: 'Now',
        furtherLink: '',
        images: [
            'IMAGES/BOGAMIS/z7929696596467_7f99f5763f4db846aedb39d9557d096d.jpg',
            'IMAGES/BOGAMIS/z7929791681929_4f6f63caa765f547e3e55a60364e6ae3.jpg',
        ],
        bullets: [
            'Led a core team of ~27 members to drive the club\'s strategic direction and promote the board game movement across Da Nang City.',
            'Organised regular club meetings, interactive workshops, and entertainment events engaging 20+ students per session.',
            'Designed original, locally-themed board games reflecting the cultural and social characteristics of Da Nang.',
            'Developed and currently manages the club\'s official website (bogamis.netlify.app).',
            'Initiated the "BOGAMIS\' Choice" event — authored analytical reviews of international board games and corresponded with global game designers.',
        ],
    },
    {
        role: 'Member of Finance & Logistics Department',
        org: 'Torai Nippon — Japanese Culture Exchange Club',
        location: 'Da Nang, Vietnam',
        dateStart: '12/2024',
        dateEnd: '07/2025',
        furtherLink: '',
        images: [],
        bullets: [
            'Co-organised the "TORAI BUNKASAI" cultural festival promoting Japanese heritage, attended by the Japanese Consul General (Aug 2025).',
            'Coordinated environmental awareness campaigns and conservation activities at the Nghia Trung Hoa Vang historical site (Jan 2025).',
        ],
    },
    {
        role: 'Co-founder & Developer',
        org: 'SOUNDHP — Audio-based Social Application',
        location: '',
        dateStart: '01/2025',
        dateEnd: 'Now',
        furtherLink: '',
        images: [],
        bullets: [
            'Co-founded a social networking platform enhancing human connection through instant audio sharing.',
            'Designed and implemented the comprehensive system architecture — frontend UI and backend server infrastructure.',
            'Built an intuitive, Locket-style interactive experience focused exclusively on audio content.',
            'Collaborated to finalise core features, optimise UX, and prepare the application for official launch.',
        ],
    },
    {
        role: 'Founder & Head of Organisation',
        org: 'The Little Pepper Fund',
        location: 'Da Nang, Vietnam',
        dateStart: '03/2025',
        dateEnd: '04/2025',
        furtherLink: '',
        images: [
            'IMAGES/LittlePepperFund/494297494_1229046712553772_7327573232339279610_n.jpg',
            'IMAGES/LittlePepperFund/494751584_1229046652553778_1697386512014432239_n.jpg',
        ],
        bullets: [
            'Led a team of ~15 members to organise charitable fundraising activities supporting underprivileged children at SOS Children\'s Village.',
            'Initiated eco-friendly upcycling workshops, transforming discarded materials into handmade teddy bears for charitable sales and direct gifts.',
            'Designed interactive outreach sessions — mosaic tile coaster making, handcrafted necklace creation, and leaf art — fostering creativity and personal development.',
        ],
    },
    {
        role: 'Member of Finance & Logistics Department',
        org: 'BlissKidz Community Club',
        location: 'Da Nang, Vietnam',
        dateStart: '09/2025',
        dateEnd: 'Now',
        furtherLink: '',
        images: [
            'IMAGES/BlissKidz/523841450_724187667035997_5373665178026715948_n.jpg',
            'IMAGES/BlissKidz/558916994_787710727350357_208044673935372664_n (1).jpg',
        ],
        bullets: [
            'Supporting financial planning, budget tracking, and logistics for community activities and club events.',
            'Participated in a regional volunteer initiative in A Luoi, providing supplies and facilitating community engagement for underprivileged highland children.',
            'Coordinated street outreach programs to assist disadvantaged individuals, fostering empathy and social responsibility.',
        ],
    },
    {
        role: 'Co-founder & Developer',
        org: 'FITBUDDY — AI-Powered Fitness Application',
        location: '',
        dateStart: '10/2025',
        dateEnd: 'Now',
        furtherLink: '',
        images: [
            'IMAGES/FitBuddy/2.jpg',
            'IMAGES/FitBuddy/3.jpg',
        ],
        bullets: [
            'Co-founded a community-driven fitness application tailored for gym practitioners.',
            'Designed the comprehensive system architecture — frontend UI and backend server infrastructure.',
            'Integrated AI to analyse user movements and deliver real-time feedback, enabling users to correct form instantly.',
            'Developed a highly personalised workout experience, overcoming static one-size-fits-all limitations.',
        ],
    },
];

function renderTimeline() {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    // Render in reverse chronological order (newest first) for the UI
    const sorted = [...EXPERIENCES].reverse();

    sorted.forEach((exp, i) => {
        const item = document.createElement('div');
        item.className = 'timeline-item animate-on-scroll';
        item.style.transitionDelay = `${i * 0.08}s`;

        const hasImages = exp.images && exp.images.length > 0;

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content${hasImages ? ' has-images' : ''}" ${hasImages ? `data-exp-index="${EXPERIENCES.indexOf(exp)}"` : ''}>
                <div class="timeline-header">
                    <div>
                        <h3 class="timeline-role">${exp.role}</h3>
                        <p class="timeline-org">${exp.org}${exp.location ? ' · ' + exp.location : ''}</p>
                    </div>
                    <span class="timeline-date">${exp.dateStart} — ${exp.dateEnd}</span>
                </div>
                <ul class="timeline-bullets">
                    ${exp.bullets.map((b) => `<li>${b}</li>`).join('')}
                </ul>
            </div>`;
        timeline.appendChild(item);
    });

    // Tap anywhere on the card to open modal (only for cards with images)
    document.querySelectorAll('.timeline-content.has-images').forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.getAttribute('data-exp-index'), 10);
            openExpModal(EXPERIENCES[idx]);
        });
    });
}

// ==========================================
// Experience Modal
// ==========================================
let _expCurrentImages = [];
let _expCurrentIdx    = 0;

// ── drag state (module-level so cleanup is always reachable) ──────────────
let _drag = {
    active:    false,
    startX:    0,
    startBase: 0,    // strip translateX at drag start (px)
    current:   0,    // live translateX during drag (px)
    strip:     null,
    wrapper:   null,
    count:     0,
};

function _dragMove(e) {
    if (!_drag.active) return;
    const clientX  = e.touches ? e.touches[0].clientX : e.clientX;
    const offset   = clientX - _drag.startX;
    const slideW   = _drag.wrapper.clientWidth;
    const minX     = -((_drag.count - 1) * slideW);
    let x          = _drag.startBase + offset;

    // rubber-band at edges
    if (x > 0)    x = offset * 0.2;
    if (x < minX) x = minX + (x - minX) * 0.2;

    _drag.current = x;
    _drag.strip.style.transform = `translateX(${x}px)`;
}

function _dragEnd() {
    if (!_drag.active) return;
    _drag.active = false;
    document.removeEventListener('mousemove',  _dragMove);
    document.removeEventListener('mouseup',    _dragEnd);
    document.removeEventListener('touchmove',  _dragMove);
    document.removeEventListener('touchend',   _dragEnd);
    if (_drag.wrapper) _drag.wrapper.style.cursor = 'grab';

    const slideW     = _drag.wrapper.clientWidth;
    const offset     = _drag.current - _drag.startBase;
    const threshold  = slideW * 0.15;

    if      (offset < -threshold && _expCurrentIdx < _drag.count - 1) _expCurrentIdx++;
    else if (offset >  threshold && _expCurrentIdx > 0)               _expCurrentIdx--;

    _drag.strip.style.transition = '';
    _snapStrip(_drag.strip, slideW);
    _syncDots();
}

function _snapStrip(strip, slideW) {
    strip.style.transform = `translateX(${-_expCurrentIdx * slideW}px)`;
}

function _syncDots() {
    document.querySelectorAll('.exp-gallery-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === _expCurrentIdx);
    });
}

function buildExpStrip(images) {
    const wrapper = document.getElementById('exp-modal-image-wrapper');
    const old = wrapper.querySelector('.exp-img-strip');
    if (old) old.remove();

    const strip = document.createElement('div');
    strip.className = 'exp-img-strip';
    strip.id = 'exp-img-strip';
    strip.style.touchAction = 'none'; // prevent browser scroll hijack

    images.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Photo ${i + 1}`;
        img.draggable = false;
        strip.appendChild(img);
    });

    wrapper.insertBefore(strip, wrapper.firstChild);
    if (images.length <= 1) return;

    wrapper.style.cursor = 'grab';

    function startDrag(clientX) {
        // Read actual current pixel offset from computed style
        const mat   = new DOMMatrix(window.getComputedStyle(strip).transform);
        const baseX = mat.m41; // translateX in pixels from the matrix

        _drag.active    = true;
        _drag.startX    = clientX;
        _drag.startBase = baseX;
        _drag.current   = baseX;
        _drag.strip     = strip;
        _drag.wrapper   = wrapper;
        _drag.count     = images.length;

        strip.style.transition = 'none';
        wrapper.style.cursor   = 'grabbing';

        document.addEventListener('mousemove',  _dragMove);
        document.addEventListener('mouseup',    _dragEnd);
        document.addEventListener('touchmove',  _dragMove, { passive: false });
        document.addEventListener('touchend',   _dragEnd);
    }

    strip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX);
    });

    strip.addEventListener('touchstart', (e) => {
        startDrag(e.touches[0].clientX);
    }, { passive: true });
}

function buildExpDots(count) {
    const dotsEl = document.getElementById('exp-gallery-dots');
    dotsEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('button');
        dot.className = 'exp-gallery-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
        dot.addEventListener('click', () => {
            _expCurrentIdx = i;
            const strip  = document.getElementById('exp-img-strip');
            const slideW = document.getElementById('exp-modal-image-wrapper').clientWidth;
            if (strip) {
                strip.style.transition = '';
                _snapStrip(strip, slideW);
            }
            _syncDots();
        });
        dotsEl.appendChild(dot);
    }
}

function updateExpStrip() {
    const strip   = document.getElementById('exp-img-strip');
    const wrapper = document.getElementById('exp-modal-image-wrapper');
    if (strip && wrapper) _snapStrip(strip, wrapper.clientWidth);
    _syncDots();
}


function openExpModal(exp) {
    const overlay   = document.getElementById('exp-modal-overlay');
    const gallery   = document.getElementById('exp-modal-gallery');
    const roleEl    = document.getElementById('exp-modal-role');
    const orgEl     = document.getElementById('exp-modal-org');
    const dateEl    = document.getElementById('exp-modal-date');
    const bulletsEl = document.getElementById('exp-modal-bullets');
    const furtherBtn= document.getElementById('exp-modal-further-btn');
    const dotsEl    = document.getElementById('exp-gallery-dots');

    // Populate info
    roleEl.textContent = exp.role;
    orgEl.textContent  = exp.org + (exp.location ? ' · ' + exp.location : '');
    dateEl.textContent = `${exp.dateStart} — ${exp.dateEnd}`;
    bulletsEl.innerHTML = exp.bullets.map(b => `<li>${b}</li>`).join('');

    // Further info link
    furtherBtn.style.display = exp.furtherLink ? 'inline-flex' : 'none';
    if (exp.furtherLink) furtherBtn.href = exp.furtherLink;

    // Images
    _expCurrentImages = exp.images || [];
    _expCurrentIdx = 0;

    if (_expCurrentImages.length > 0) {
        gallery.style.display = 'block';
        buildExpStrip(_expCurrentImages);
        buildExpDots(_expCurrentImages.length);
        dotsEl.style.display = _expCurrentImages.length > 1 ? 'flex' : 'none';
        updateExpStrip();
    } else {
        gallery.style.display = 'none';
    }

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function initExpModal() {
    const overlay  = document.getElementById('exp-modal-overlay');
    const closeBtn = document.getElementById('exp-modal-close');

    function closeModal() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && _expCurrentImages.length > 1) {
            _expCurrentIdx = (_expCurrentIdx - 1 + _expCurrentImages.length) % _expCurrentImages.length;
            updateExpStrip();
        }
        if (e.key === 'ArrowRight' && _expCurrentImages.length > 1) {
            _expCurrentIdx = (_expCurrentIdx + 1) % _expCurrentImages.length;
            updateExpStrip();
        }
    });
}

// ==========================================
// Projects  (chronological order — oldest first)
// ==========================================
// ┌─────────────────────────────────────────────────────────────────────┐
// │  TEMPLATE — copy an object below and fill in your details to add   │
// │  a new project card. Keep entries in chronological order.           │
// │                                                                     │
// │  {                                                                  │
// │      title: 'Project Name',                                         │
// │      description: 'A short description of the project.',            │
// │      tags: ['Tech1', 'Tech2'],                                      │
// │      icon: '🔥',                                                    │
// │      link: 'https://your-project-link.com',  // <-- UPDATE THIS    │
// │  },                                                                 │
// └─────────────────────────────────────────────────────────────────────┘

const PROJECTS = [
    {
        title: 'Bogamis Board Game Club Website',
        description:
            'Official website for the Bogamis Board Game Club — featuring club information, event listings, and board game reviews.',
        tags: ['HTML', 'CSS', 'JavaScript'],
        icon: '🎲',
        link: 'https://bogamis.netlify.app/', // <-- UPDATE with your actual link
    },
    {
        title: 'SOUNDHP',
        description:
            'An audio-based social networking platform designed to enhance human connection through instant audio sharing — a Locket-style experience for voice content.',
        tags: ['Flutter', 'Supabase', 'Dart'],
        icon: '🔊',
        link: '#', // <-- UPDATE with your actual link
    },
    {
        title: 'FITBUDDY',
        description:
            'AI-powered fitness application that analyses user movements in real time and delivers instant form-correction feedback for personalised workouts.',
        tags: ['Flutter', 'TensorFlow', 'MediaPipe', 'AI'],
        icon: '💪',
        link: '#', // <-- UPDATE with your actual link
    },
    {
        title: 'Portfolio Website',
        description:
            'This very portfolio! A showcase of creative web development with 3D frog rain, particle effects, and minimalist black & white aesthetics.',
        tags: ['HTML', 'CSS', 'Three.js'],
        icon: '🌐',
        link: '#', // <-- UPDATE with your actual link
    },
];

function renderProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    // Reverse to show newest first
    const sorted = [...PROJECTS].reverse();

    sorted.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'project-card animate-on-scroll';

        const linkHref = p.link && p.link !== '#' ? p.link : '#';
        const linkTarget = p.link && p.link !== '#' ? ' target="_blank" rel="noopener"' : '';

        card.innerHTML = `
            <div class="card-header">
                <span class="card-icon">${p.icon}</span>
            </div>
            <h3 class="card-title">${p.title}</h3>
            <p class="card-description">${p.description}</p>
            <div class="card-tags">
                ${p.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
            </div>
            <a href="${linkHref}" class="btn-explore"${linkTarget}>
                Explore Project
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                </svg>
            </a>`;
        grid.appendChild(card);
    });
}

// ==========================================
// Blog Data & Reader
// ==========================================
const BLOG_POSTS = [
    {
        id: 'apohand-assistive-glove',
        title: 'Building APOHAND: How I Engineered a $25 Smart Assistive Glove with AI Object Detection',
        date: 'June 2025',
        readTime: '6 min read',
        icon: '🧤',
        tags: ['AI', 'Raspberry Pi', 'Python', 'Computer Vision'],
        summary: 'A deep dive into developing a 3D-printed smart wearable for visually impaired individuals, integrating OpenCV, TensorFlow Lite, and automated Vietnamese voice warnings.',
        content: `
            <p>Navigating public spaces independently remains a major challenge for visually impaired individuals in developing regions. High-tech assistive wearables often cost thousands of dollars, making them inaccessible to the majority of people who need them most.</p>
            <h3>The Challenge & Core Architecture</h3>
            <p>APOHAND was born from a simple question: <i>How can we leverage lightweight AI models and affordable microcontrollers to build a reliable assistive device under $30?</i></p>
            <p>The system comprises three main hardware & software components:</p>
            <ul>
                <li><strong>Raspberry Pi Zero W / 4B:</strong> Low-power onboard processing unit managing camera streams and sensor inputs.</li>
                <li><strong>Custom 3D-Printed Wearable Glove:</strong> Ergonomically shaped to hold ultrasonic distance sensors, a camera module, and haptic feedback motors.</li>
                <li><strong>TensorFlow Lite & OpenCV Pipeline:</strong> Optimized object detection model capable of identifying over 80 common obstacle categories at 15+ FPS.</li>
            </ul>
            <h3>Real-Time Audio Warnings in Vietnamese</h3>
            <p>Rather than relying solely on generic vibration patterns, APOHAND uses lightweight Text-to-Speech (TTS) to deliver instantaneous Vietnamese voice alerts (e.g., <i>"Phía trước có chướng ngại vật: Xe máy"</i>). It also includes voice-activated emergency protocols that transmit automated location emails to caregivers upon request.</p>
            <h3>Impact & Future Roadmap</h3>
            <p>By keeping hardware costs around $25, APOHAND proves that AI-powered accessibility tools can be democratized globally. Future updates will focus on custom PCB integration and low-latency indoor spatial mapping.</p>
        `
    },
    {
        id: 'voai-journey',
        title: 'My Experience & Reflections in the VOAI National Selection for International Olympiad in AI',
        date: 'January 2025',
        readTime: '8 min read',
        icon: '🧠',
        tags: ['AI', 'Machine Learning', 'Olympiad', 'Python'],
        summary: 'Key takeaways, algorithm insights, and problem-solving strategies from competing at the national selection level for the International Olympiad in Artificial Intelligence.',
        content: `
            <p>Participating in the National Selection Round (VOAI) for the International Olympiad in Artificial Intelligence was one of the most intense and intellectually rewarding milestones in my high school career.</p>
            <h3>Core Competency Domains</h3>
            <p>The contest tested candidate depth across machine learning fundamentals, computer vision architectures, natural language processing, and ethical AI design:</p>
            <ul>
                <li><strong>Computer Vision & CNNs:</strong> Feature extraction, attention mechanisms, and model pruning for constrained hardware.</li>
                <li><strong>Natural Language Processing:</strong> Transformer self-attention, tokenization strategies, and fine-tuning lightweight LLMs.</li>
                <li><strong>Algorithmic Optimization:</strong> Loss function engineering, hyperparameter tuning under strict time limits, and data augmentation.</li>
            </ul>
            <h3>Lessons Learned</h3>
            <p>Competing against top students nationwide taught me the paramount importance of structured hypothesis testing over trial-and-error. Understanding the math behind loss gradients and vector embeddings proved far more valuable than simply tuning black-box models.</p>
        `
    },
    {
        id: 'soundhp-audio-architecture',
        title: 'Designing Liquid Glass UI and Real-Time Audio Architecture for SOUNDHP',
        date: 'March 2025',
        readTime: '5 min read',
        icon: '🎙️',
        tags: ['Flutter', 'Supabase', 'UI/UX', 'Mobile App'],
        summary: 'How we built a Locket-style voice sharing application with Flutter frontend and Supabase real-time audio storage for authentic daily human connection.',
        content: `
            <p>In an era dominated by curated text and polished photos, authentic human connection is often lost. With SOUNDHP, our team set out to recreate the spontaneity of instant voice sharing through a minimalist "Locket-style" widget interface.</p>
            <h3>Frontend Glassmorphism & Liquid UI</h3>
            <p>We built the mobile app using Flutter, crafting custom frosted glass shaders and fluid animations to give users a tactile, soothing interaction when recording or playing back short voice snippets.</p>
            <h3>Real-Time Audio Backend with Supabase</h3>
            <p>To support instant distribution to friends' home screens, we designed a high-concurrency Supabase architecture leveraging WebSocket subscriptions and encrypted audio storage buckets.</p>
        `
    }
];

function renderBlog() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;
    grid.innerHTML = '';

    BLOG_POSTS.forEach((post) => {
        const card = document.createElement('div');
        card.className = 'blog-card animate-on-scroll';
        
        const tagsHtml = post.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        card.innerHTML = `
            <div class="blog-card-header">
                <span class="blog-icon">${post.icon}</span>
                <span class="blog-date">${post.date} · ${post.readTime}</span>
            </div>
            <h3 class="blog-title">${post.title}</h3>
            <p class="blog-summary">${post.summary}</p>
            <div class="card-tags">${tagsHtml}</div>
            <button class="btn-explore btn-read-blog" data-post-id="${post.id}">
                Read Article
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            </button>
        `;

        grid.appendChild(card);
    });

    initBlogModal();
}

function initBlogModal() {
    const modal = document.getElementById('blog-modal');
    const overlay = document.getElementById('blog-modal-overlay');
    const closeBtn = document.getElementById('blog-modal-close');
    const headerEl = document.getElementById('blog-modal-header');
    const bodyEl = document.getElementById('blog-modal-body');

    if (!modal || !closeBtn || !overlay) return;

    function openModal(postId) {
        const post = BLOG_POSTS.find(p => p.id === postId);
        if (!post) return;

        const tagsHtml = post.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

        headerEl.innerHTML = `
            <div class="blog-meta">${post.date} · ${post.readTime}</div>
            <h2>${post.title}</h2>
            <div class="card-tags" style="margin-top: 12px;">${tagsHtml}</div>
        `;
        bodyEl.innerHTML = post.content;

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.btn-read-blog').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postId = e.currentTarget.getAttribute('data-post-id');
            openModal(postId);
        });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });
}

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        btn.classList.add('sent');
        btn.innerHTML = '<span>Message Sent! ✓</span>';
        setTimeout(() => {
            btn.classList.remove('sent');
            btn.innerHTML =
                '<span>Send Message</span><span class="btn-arrow">→</span>';
            form.reset();
        }, 3000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    new ParticlesBackground();
    new FrogRain();

    initNavigation();
    renderTimeline();
    renderProjects();
    renderBlog();
    initScrollAnimations();
    initContactForm();
    initExpModal();
    
    setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        if (ls && ls.style.display !== 'none') {
            ls.classList.add('loaded');
            setTimeout(() => { ls.style.display = 'none'; }, 800);
        }
    }, 7000);
});

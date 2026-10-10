/**
 * 汪佩宗个人作品集 - Three.js + GSAP 炸裂粒子交互
 * 科技艺术简约风 + 3D粒子特效
 */

document.addEventListener('DOMContentLoaded', () => {
    initLoading();
    initThreeParticles();
    initCursorGlow();
    initNavigation();
    initScrollAnimations();
    initProjectTabs();
    initSmoothScroll();
});

/* ============================================
   Loading Screen
   ============================================ */
function initLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 2000);
}

/* ============================================
   Three.js + GSAP 炸裂粒子系统
   ============================================ */
function initThreeParticles() {
    const canvas = document.getElementById('particleCanvas');
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 4000 : 12000;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.0008);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 600;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050508, 1);

    // Mouse tracking
    const mouse = new THREE.Vector2(-999, -999);
    const targetMouse = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mousePosition3D = new THREE.Vector3();

    document.addEventListener('mousemove', (e) => {
        targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mouseleave', () => {
        targetMouse.set(-999, -999);
    });

    // Touch support
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        }
    }, { passive: true });

    // Color palette
    const colorPalette = [
        new THREE.Color(0x00d4ff),
        new THREE.Color(0x3b82f6),
        new THREE.Color(0x8b5cf6),
        new THREE.Color(0xec4899),
        new THREE.Color(0x06b6d4),
        new THREE.Color(0xa855f7),
    ];

    // Particle data
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const originalPositions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const colorIndices = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Spiral galaxy distribution
        const armIndex = Math.floor(Math.random() * 3);
        const armAngle = (armIndex / 3) * Math.PI * 2;
        const radius = 50 + Math.pow(Math.random(), 0.5) * 500;
        const angle = armAngle + radius * 0.01 + (Math.random() - 0.5) * 0.5;
        const height = (Math.random() - 0.5) * 50 * (1 - radius / 600);

        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius;
        positions[i3 + 2] = height + (Math.random() - 0.5) * 100;

        originalPositions[i3] = positions[i3];
        originalPositions[i3 + 1] = positions[i3 + 1];
        originalPositions[i3 + 2] = positions[i3 + 2];

        velocities[i3] = (Math.random() - 0.5) * 0.5;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;

        phases[i] = Math.random() * Math.PI * 2;

        const colorIndex = Math.floor(Math.random() * colorPalette.length);
        colorIndices[i] = colorIndex;
        const color = colorPalette[colorIndex];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 4 + 1;
    }

    // Custom shader material
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector3(0, 0, 0) },
            uMouseActive: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform vec3 uMouse;
            uniform float uMouseActive;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                vec3 pos = position;

                // Wave motion
                float wave = sin(uTime * 0.8 + pos.x * 0.01 + pos.y * 0.01) * 8.0;
                pos.z += wave;
                pos.x += cos(uTime * 0.5 + pos.y * 0.008) * 5.0;
                pos.y += sin(uTime * 0.6 + pos.x * 0.008) * 5.0;

                // Mouse interaction - particles attracted to mouse
                if (uMouseActive > 0.5) {
                    float dist = distance(pos.xy, uMouse.xy);
                    float influence = smoothstep(200.0, 0.0, dist);
                    vec3 dir = normalize(uMouse - pos);
                    pos += dir * influence * 30.0;
                }

                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

                // Size based on distance and mouse proximity
                float sizeMult = 1.0;
                if (uMouseActive > 0.5) {
                    float mouseDist = distance(pos.xy, uMouse.xy);
                    sizeMult = 1.0 + smoothstep(150.0, 0.0, mouseDist) * 2.0;
                }

                gl_PointSize = size * sizeMult * uPixelRatio * (400.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;

                // Alpha based on distance from camera
                float depthAlpha = smoothstep(800.0, 100.0, -mvPosition.z);
                vAlpha = depthAlpha;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));

                // Soft glow core
                float core = 1.0 - smoothstep(0.0, 0.15, dist);
                // Outer glow
                float glow = 1.0 - smoothstep(0.15, 0.5, dist);

                float alpha = (core * 0.9 + glow * 0.3) * vAlpha;

                // Color enhancement
                vec3 finalColor = vColor * (1.0 + core * 0.5);

                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Connection lines between nearby particles
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
    });

    let lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * 6); // Max lines
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Second layer - outer glow particles (larger, fewer)
    const glowCount = Math.floor(particleCount * 0.1);
    const glowPositions = new Float32Array(glowCount * 3);
    const glowColors = new Float32Array(glowCount * 3);
    const glowSizes = new Float32Array(glowCount);

    for (let i = 0; i < glowCount; i++) {
        const i3 = i * 3;
        const r = 300 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        glowPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
        glowPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        glowPositions[i3 + 2] = r * Math.cos(phi);

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        glowColors[i3] = color.r;
        glowColors[i3 + 1] = color.g;
        glowColors[i3 + 2] = color.b;

        glowSizes[i] = Math.random() * 15 + 8;
    }

    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float uTime;

            void main() {
                vColor = color;
                vec3 pos = position;

                // Slow drift
                pos.x += sin(uTime * 0.1 + position.y * 0.005) * 20.0;
                pos.y += cos(uTime * 0.08 + position.x * 0.005) * 20.0;

                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;

            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;

                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.15;

                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));

    const glowSystem = new THREE.Points(glowGeometry, glowMaterial);
    scene.add(glowSystem);

    // Central glow sphere
    const sphereGeometry = new THREE.SphereGeometry(80, 32, 32);
    const sphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float uTime;

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;

                vec3 pos = position;
                float pulse = sin(uTime * 0.5) * 0.05;
                pos *= 1.0 + pulse;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float uTime;

            void main() {
                float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);

                vec3 color1 = vec3(0.0, 0.83, 1.0); // cyan
                vec3 color2 = vec3(0.55, 0.36, 0.96); // purple
                vec3 color3 = vec3(0.93, 0.29, 0.6); // pink

                float t = sin(uTime * 0.3) * 0.5 + 0.5;
                vec3 color = mix(color1, color2, t);
                color = mix(color, color3, sin(uTime * 0.2 + vPosition.x * 0.01) * 0.5 + 0.5);

                gl_FragColor = vec4(color, intensity * 0.3);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
    });

    const glowSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(glowSphere);

    // Orbit rings
    const ringCount = 3;
    for (let r = 0; r < ringCount; r++) {
        const ringRadius = 150 + r * 80;
        const ringGeometry = new THREE.RingGeometry(ringRadius - 1, ringRadius + 1, 64);
        const ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOffset: { value: r * 2.0 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float uTime;
                uniform float uOffset;

                void main() {
                    float angle = atan(vUv.y - 0.5, vUv.x - 0.5) / (2.0 * 3.14159) + 0.5;
                    float flow = fract(angle + uTime * 0.05 + uOffset * 0.3);
                    float alpha = smoothstep(0.0, 0.1, flow) * smoothstep(0.3, 0.1, flow);
                    alpha *= 0.15;

                    vec3 color = vec3(0.0, 0.83, 1.0);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ring.rotation.y = Math.random() * Math.PI;
        scene.add(ring);
    }

    // Animation state
    let isActive = true;
    const clock = new THREE.Clock();

    // GSAP animations
    // Entrance animation - particles expand from center
    const posAttr = particleGeometry.attributes.position;
    const tempPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        tempPositions[i3] = 0;
        tempPositions[i3 + 1] = 0;
        tempPositions[i3 + 2] = 0;
    }

    // Store original positions for animation
    const targetPositions = new Float32Array(originalPositions);

    // Animate particles expanding
    gsap.to(tempPositions, {
        duration: 3,
        ease: 'power2.out',
        onUpdate: function() {
            const progress = this.progress();
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                posAttr.array[i3] = targetPositions[i3] * progress;
                posAttr.array[i3 + 1] = targetPositions[i3 + 1] * progress;
                posAttr.array[i3 + 2] = targetPositions[i3 + 2] * progress;
            }
            posAttr.needsUpdate = true;
        },
    });

    function updateConnections() {
        const posArray = posAttr.array;
        const maxDistance = 80;
        const maxConnections = 3;
        let lineIndex = 0;

        for (let i = 0; i < Math.min(particleCount, 500); i++) {
            let connections = 0;
            const i3 = i * 3;

            for (let j = i + 1; j < Math.min(particleCount, 500); j++) {
                if (connections >= maxConnections) break;

                const j3 = j * 3;
                const dx = posArray[i3] - posArray[j3];
                const dy = posArray[i3 + 1] - posArray[j3 + 1];
                const dz = posArray[i3 + 2] - posArray[j3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < maxDistance) {
                    const li = lineIndex * 6;
                    if (li + 5 < linePositions.length) {
                        linePositions[li] = posArray[i3];
                        linePositions[li + 1] = posArray[i3 + 1];
                        linePositions[li + 2] = posArray[i3 + 2];
                        linePositions[li + 3] = posArray[j3];
                        linePositions[li + 4] = posArray[j3 + 1];
                        linePositions[li + 5] = posArray[j3 + 2];
                        lineIndex++;
                    }
                    connections++;
                }
            }
        }

        // Clear remaining line positions
        for (let i = lineIndex * 6; i < linePositions.length; i++) {
            linePositions[i] = 0;
        }

        lineGeometry.attributes.position.needsUpdate = true;
    }

    function animate() {
        if (!isActive) return;
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Smooth mouse interpolation
        mouse.x += (targetMouse.x - mouse.x) * 0.05;
        mouse.y += (targetMouse.y - mouse.y) * 0.05;

        // Update mouse 3D position
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(mousePlane, mousePosition3D);

        // Update uniforms
        particleMaterial.uniforms.uTime.value = elapsedTime;
        particleMaterial.uniforms.uMouse.value.copy(mousePosition3D);
        particleMaterial.uniforms.uMouseActive.value = (mouse.x > -10) ? 1 : 0;
        glowMaterial.uniforms.uTime.value = elapsedTime;
        sphereMaterial.uniforms.uTime.value = elapsedTime;

        // Scene rotation
        particleSystem.rotation.y += 0.0003;
        particleSystem.rotation.x += 0.0001;
        glowSystem.rotation.y -= 0.0002;
        glowSphere.rotation.y += 0.0005;

        // Pulse effect on sphere
        const pulse = Math.sin(elapsedTime * 0.5) * 0.05;
        glowSphere.scale.setScalar(1 + pulse);

        // Update connections every 3 frames for performance
        if (Math.floor(elapsedTime * 60) % 3 === 0) {
            updateConnections();
        }

        // Update ring materials
        scene.traverse((child) => {
            if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    });

    // Visibility handler
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isActive = false;
            clock.stop();
        } else {
            isActive = true;
            clock.start();
            animate();
        }
    });
}

/* ============================================
   Cursor Glow Effect
   ============================================ */
function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    const isMobile = window.matchMedia('(pointer: coarse)').matches;

    if (isMobile) {
        glow.style.display = 'none';
        return;
    }

    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateGlow() {
        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;
        glow.style.left = currentX + 'px';
        glow.style.top = currentY + 'px';
        requestAnimationFrame(animateGlow);
    }
    animateGlow();
}

/* ============================================
   Navigation
   ============================================ */
function initNavigation() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    navToggle?.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

/* ============================================
   Scroll Animations
   ============================================ */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));

    // Animate skill bars
    const skillBars = document.querySelectorAll('.skill-fill');
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => { bar.style.width = width; }, 200);
                skillObserver.unobserve(bar);
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(bar => skillObserver.observe(bar));
}

/* ============================================
   Project Tabs
   ============================================ */
function initProjectTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetTab) {
                    panel.classList.add('active');
                    const elements = panel.querySelectorAll('[data-animate]');
                    elements.forEach(el => {
                        el.classList.remove('animated');
                        void el.offsetWidth;
                        setTimeout(() => el.classList.add('animated'), 100);
                    });
                }
            });
        });
    });
}

/* ============================================
   Smooth Scroll
   ============================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

/* ============================================
   Parallax Effect for Hero
   ============================================ */
window.addEventListener('scroll', () => {
    if (window.innerWidth < 768) return; // Skip parallax on mobile
    const scrolled = window.pageYOffset;
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && scrolled < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
        heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.8;
    }
});

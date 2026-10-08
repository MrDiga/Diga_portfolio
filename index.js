(() => {
    "use strict";

    const root = document.documentElement;
    const header = document.querySelector(".header");
    const menu = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".navigation");
    const themeButton = document.querySelector(".theme-toggle");
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const navLinks = [...navigation.querySelectorAll("a")];
    const sections = navLinks.map(link => document.querySelector(link.getAttribute("href")));
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 900px)");
    const systemLight = matchMedia("(prefers-color-scheme: light)");
    const finePointer = matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine)");
    const noTouch = matchMedia("(any-pointer: coarse)");
    const richMotionAllowed = () => finePointer.matches && !noTouch.matches && !reducedMotion.matches;
    const storageKey = "digambar-portfolio-theme";
    let explicitTheme = false;
    let updateScene = () => {};
    let syncNetwork = () => {};

    try {
        explicitTheme = ["dark", "light"].includes(localStorage.getItem(storageKey));
    } catch (_) {
        // Private browsing may disable storage; the toggle remains usable.
    }

    function setTheme(theme, persist = false) {
        const light = theme === "light";
        root.dataset.theme = light ? "light" : "dark";
        themeButton.setAttribute("aria-pressed", String(light));
        themeButton.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
        themeColor.content = light ? "#f6f7fb" : "#090b10";
        if (persist) {
            explicitTheme = true;
            try { localStorage.setItem(storageKey, root.dataset.theme); } catch (_) {}
        }
    }

    setTheme(root.dataset.theme);
    themeButton.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark", true));
    systemLight.addEventListener("change", event => {
        if (!explicitTheme) setTheme(event.matches ? "light" : "dark");
    });
    window.addEventListener("storage", event => {
        if (event.key === storageKey) {
            explicitTheme = ["dark", "light"].includes(event.newValue);
            setTheme(explicitTheme ? event.newValue : systemLight.matches ? "light" : "dark");
        }
    });

    function setMenu(open, restoreFocus = false) {
        header.classList.toggle("menu-open", open);
        menu.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        if (restoreFocus) menu.focus();
    }
    menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
    navLinks.forEach(link => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && header.classList.contains("menu-open")) setMenu(false, true);
    });
    document.addEventListener("click", event => {
        if (!header.contains(event.target)) setMenu(false);
    });
    header.addEventListener("focusout", () => {
        requestAnimationFrame(() => {
            if (!header.contains(document.activeElement)) setMenu(false);
        });
    });
    mobile.addEventListener("change", () => setMenu(false));

    // Decorative controls are added without changing the existing HTML content.
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    const backTop = document.createElement("button");
    backTop.className = "back-to-top";
    backTop.type = "button";
    backTop.setAttribute("aria-label", "Back to top");
    backTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v14"/></svg>';
    backTop.disabled = true;
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    const glowSpot = document.createElement("span");
    glow.append(glowSpot);
    document.body.append(progress, glow, backTop);
    backTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
        document.querySelector(".brand").focus({ preventScroll: true });
    });
    navLinks.forEach((link, index) => link.style.setProperty("--menu-delay", index * 35 + "ms"));

    // A single frame updates scroll feedback; no changing document dimensions.
    let scrollQueued = false;
    function updateScrollState() {
        // Read geometry before writing styles to avoid interleaved layout work.
        const position = scrollY;
        const distance = root.scrollHeight - innerHeight;
        let current = null;
        const marker = Math.min(innerHeight * .35, 240);
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= marker) current = section.id;
        }
        if (position >= distance - 5) current = "contact";
        updateScene();
        header.classList.toggle("scrolled", position > 16);
        progress.style.transform = "scaleX(" + Math.max(0, Math.min(1, distance > 0 ? position / distance : 0)) + ")";
        const showTop = position > Math.max(500, innerHeight * .7);
        backTop.classList.toggle("is-visible", showTop);
        backTop.disabled = !showTop;
        navLinks.forEach(link => {
            const active = link.hash === "#" + current;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
        scrollQueued = false;
    }
    function queueScroll() {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(updateScrollState);
        }
    }
    window.addEventListener("scroll", queueScroll, { passive: true });
    window.addEventListener("resize", queueScroll);
    if ("ResizeObserver" in window) new ResizeObserver(queueScroll).observe(document.body);
    updateScrollState();

    // One-time reveal animations release their transforms before normal hover interactions.
    const seen = new WeakSet();
    const counted = new WeakSet();
    const motionTargets = new Set();
    let revealObserver;
    function animateCount(count) {
        if (counted.has(count)) return;
        counted.add(count);
        const target = Number(count.dataset.count);
        if (!Number.isFinite(target) || reducedMotion.matches) return;
        const start = performance.now();
        function tick(now) {
            const fraction = Math.min((now - start) / 950, 1);
            count.textContent = String(Math.round(target * (1 - Math.pow(1 - fraction, 3))));
            if (fraction < 1 && !reducedMotion.matches && !document.hidden) requestAnimationFrame(tick);
            else count.textContent = String(target);
        }
        requestAnimationFrame(tick);
    }
    function reveal(element, instant = false) {
        if (instant) {
            // Keyboard focus must never wait for an entrance animation or its delay.
            element.classList.remove("motion-pending", "motion-enter");
            element.classList.add("motion-immediate");
        }
        if (seen.has(element)) return;
        seen.add(element);
        element.classList.remove("motion-pending");
        element.classList.add("is-revealed");
        if (!instant && !reducedMotion.matches) element.classList.add("motion-enter");
        element.querySelectorAll("[data-count]").forEach(animateCount);
        if (revealObserver) revealObserver.unobserve(element);
    }
    document.addEventListener("animationend", event => {
        if (["motion-arrive", "heading-arrive", "visual-arrive"].includes(event.animationName)) event.target.classList.remove("motion-enter");
        if (event.animationName === "terminal-line" && event.target.matches(".terminal dl > div:last-child")) {
            document.querySelector(".system-visual").classList.add("terminal-settled");
        }
    });
    document.querySelectorAll(".terminal dl > div").forEach((line, index) => line.style.setProperty("--line-delay", 650 + index * 130 + "ms"));
    document.querySelectorAll(".chips").forEach(chips => {
        [...chips.children].forEach((chip, index) => chip.style.setProperty("--chip-delay", Math.min(index * 24, 180) + "ms"));
    });
    document.querySelectorAll(".metrics > div").forEach((item, index) => item.style.setProperty("--item-delay", index * 85 + "ms"));
    document.querySelectorAll(".contact-panel > .eyebrow, .contact-panel > h2, .contact-panel > p:not(.eyebrow), .contact-panel .actions .button, .contact-email")
        .forEach((item, index) => {
            item.classList.add("contact-entrance");
            item.style.setProperty("--contact-delay", 80 + index * 55 + "ms");
        });

    function register(element, delay = 0, direction = "up") {
        if (!element) return;
        motionTargets.add(element);
        element.style.setProperty("--motion-delay", delay + "ms");
        if (direction === "left") element.style.setProperty("--enter-x", "-16px");
        if (direction === "right") element.style.setProperty("--enter-x", "16px");
        if (direction === "scale") element.style.setProperty("--enter-scale", ".975");
    }
    document.querySelectorAll(".reveal").forEach(element => {
        if (element.matches(".section-heading")) {
            element.querySelectorAll(".eyebrow,h2,:scope > p:not(.eyebrow),.project-label")
                .forEach((child, index) => register(child, index * 75));
        } else {
            const siblings = [...element.parentElement.children].filter(child => child.matches(".reveal"));
            const delay = Math.min(siblings.indexOf(element) * (mobile.matches ? 45 : 65), 180);
            const direction = element.matches(".about-copy") ? "right"
                : element.matches(".about > :first-child") ? "left"
                : element.matches(".featured-project") ? "scale" : "up";
            register(element, delay, direction);
            if (element.matches(".bento")) {
                element.style.setProperty("--enter-x", siblings.indexOf(element) % 2 ? "14px" : "-14px");
                element.style.setProperty("--enter-scale", ".96");
            }
        }
    });
    register(document.querySelector(".footer"), 0);

    // A brief, non-interactive opening curtain; never used for deep links or touch screens.
    let opening = null;
    let openingTimer = 0;
    const playOpening = richMotionAllowed() && !location.hash && scrollY < 80;
    function dismissOpening() {
        clearTimeout(openingTimer);
        if (opening) opening.remove();
        opening = null;
        root.classList.remove("opening-sequence");
    }
    if (playOpening) {
        opening = document.createElement("div");
        opening.className = "opening-curtain";
        opening.setAttribute("aria-hidden", "true");
        const logo = document.querySelector(".brand-logo img").cloneNode();
        logo.alt = "";
        opening.append(logo);
        document.body.append(opening);
        root.classList.add("opening-sequence");
        openingTimer = setTimeout(dismissOpening, 820);
        document.addEventListener("pointerdown", dismissOpening, { once: true });
        document.addEventListener("keydown", dismissOpening, { once: true });
    }

    const heroSequence = [
        [".hero-copy > .badge", 0], [".hero h1", 90], [".introduction", 170],
        [".hero-description", 220], [".hero .actions .button:first-child", 300],
        [".hero .actions .button:last-child", 365], [".hero .social-links", 510],
        [".hero-stack", 450], [".system-visual", 210, "scale"]
    ];
    if ("IntersectionObserver" in window && !reducedMotion.matches) {
        revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
        }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
        motionTargets.forEach(element => {
            element.classList.add("motion-pending");
            revealObserver.observe(element);
        });
        // Deep links and restored scroll positions should not replay a hidden hero.
        if (!location.hash && scrollY < 80) {
            const initialHeroItems = [];
            heroSequence.forEach(([selector, delay, direction]) => {
                const element = document.querySelector(selector);
                const onScreen = element.getBoundingClientRect().top < innerHeight;
                register(element, onScreen ? delay + (playOpening ? 280 : 0) : 0, direction);
                element.classList.add("motion-pending");
                if (onScreen) initialHeroItems.push(element);
                else revealObserver.observe(element);
            });
            requestAnimationFrame(() => requestAnimationFrame(() => {
                initialHeroItems.forEach(element => reveal(element));
            }));
        }
    } else {
        motionTargets.forEach(element => reveal(element, true));
    }
    document.addEventListener("focusin", event => {
        for (const element of motionTargets) {
            if (element.contains(event.target)) reveal(element, true);
        }
    });

    // Pause ambient loops when the hero is offscreen and whenever the tab is hidden.
    if ("IntersectionObserver" in window) {
        const ambientObserver = new IntersectionObserver(entries => {
            root.classList.toggle("hero-paused", !entries[0].isIntersecting);
            syncNetwork();
        });
        ambientObserver.observe(document.querySelector(".hero"));
    }
    function updatePageVisibility() {
        root.classList.toggle("page-paused", document.hidden);
        if (document.hidden) stopPointer();
        syncNetwork();
    }
    document.addEventListener("visibilitychange", updatePageVisibility);

    // Fine-pointer effects: a single RAF loop settles and stops after pointer movement.
    const magneticTargets = new Set(document.querySelectorAll(".hero .actions .button, .contact-panel .button-primary"));
    let pointerEnabled = false;
    let pointerFrame = 0;
    let pointerAbort;
    let targetX = 0, targetY = 0, glowX = 0, glowY = 0;
    let pointerStarted = false;
    let activeElement = null, activeBounds = null;

    function resetActive() {
        if (activeElement) {
            ["--magnet-x", "--magnet-y", "--tilt-x", "--tilt-y", "--spot-x", "--spot-y"].forEach(key => activeElement.style.removeProperty(key));
        }
        activeElement = null;
        activeBounds = null;
    }
    function stopPointer() {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
        glow.classList.remove("is-active");
        pointerStarted = false;
        resetActive();
    }
    function pointerTick() {
        glowX += (targetX - glowX) * .16;
        glowY += (targetY - glowY) * .16;
        glowSpot.style.transform = "translate3d(" + (glowX - 220) + "px," + (glowY - 220) + "px,0)";
        if (activeElement && activeBounds) {
            const x = Math.max(-.5, Math.min(.5, (targetX - activeBounds.left) / activeBounds.width - .5));
            const y = Math.max(-.5, Math.min(.5, (targetY - activeBounds.top) / activeBounds.height - .5));
            if (magneticTargets.has(activeElement)) {
                activeElement.style.setProperty("--magnet-x", (x * 6).toFixed(2) + "px");
                activeElement.style.setProperty("--magnet-y", (y * 6).toFixed(2) + "px");
            } else {
                const tilt = activeElement.matches(".featured-project") ? 1.5 : 3;
                activeElement.style.setProperty("--tilt-x", (-y * tilt).toFixed(2) + "deg");
                activeElement.style.setProperty("--tilt-y", (x * tilt).toFixed(2) + "deg");
                activeElement.style.setProperty("--spot-x", (glowX - activeBounds.left).toFixed(1) + "px");
                activeElement.style.setProperty("--spot-y", (glowY - activeBounds.top).toFixed(1) + "px");
            }
        }
        if (Math.abs(targetX - glowX) + Math.abs(targetY - glowY) > .4 && pointerEnabled) {
            pointerFrame = requestAnimationFrame(pointerTick);
        } else pointerFrame = 0;
    }
    function handlePointer(event) {
        if (event.pointerType !== "mouse") { stopPointer(); return; }
        targetX = event.clientX;
        targetY = event.clientY;
        if (!pointerStarted) {
            glowX = targetX;
            glowY = targetY;
            pointerStarted = true;
        }
        glow.classList.add("is-active");
        const candidate = event.target.closest(".button,.skill-card,.ai-card,.featured-project,.experience-card,.bento");
        const next = candidate && (magneticTargets.has(candidate) || candidate.matches(".card")) ? candidate : null;
        if (next !== activeElement) {
            resetActive();
            activeElement = next;
            if (next) activeBounds = next.getBoundingClientRect();
        }
        if (!pointerFrame) pointerFrame = requestAnimationFrame(pointerTick);
    }
    function configurePointer() {
        pointerEnabled = richMotionAllowed();
        if (pointerAbort) pointerAbort.abort();
        stopPointer();
        if (!pointerEnabled) return;
        pointerAbort = new AbortController();
        const options = { passive: true, signal: pointerAbort.signal };
        document.addEventListener("pointermove", handlePointer, options);
        document.documentElement.addEventListener("pointerleave", stopPointer, options);
        window.addEventListener("blur", stopPointer, options);
        window.addEventListener("scroll", resetActive, options);
        window.addEventListener("resize", stopPointer, options);
    }
    finePointer.addEventListener("change", configurePointer);
    noTouch.addEventListener("change", configurePointer);
    reducedMotion.addEventListener("change", () => {
        if (reducedMotion.matches) {
            dismissOpening();
            if (revealObserver) revealObserver.disconnect();
            motionTargets.forEach(element => {
                element.classList.remove("motion-pending", "motion-enter");
                reveal(element, true);
            });
        }
        configurePointer();
    });
    // Shared desktop scene controller: bounded parallax and a small 24fps neural canvas.
    const hero = document.querySelector(".hero");
    const graphGrid = document.querySelector(".graph-grid");
    const projectVisual = document.querySelector(".workflow-visual");
    const sectionLabels = [...document.querySelectorAll(".section-heading .eyebrow")];
    const sceneTargets = [
        { element: graphGrid, anchor: hero, range: 10 },
        { element: projectVisual, anchor: document.querySelector(".featured-project"), range: 9 },
        ...sectionLabels.map(element => ({ element, anchor: element.closest("section"), range: 3 }))
    ];
    if ("IntersectionObserver" in window) {
        const sceneObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                entry.target.classList.toggle("scene-visible", entry.isIntersecting);
            }
        }, { rootMargin: "60px" });
        document.querySelectorAll(".ai-card,.featured-project,.contact-panel").forEach(element => sceneObserver.observe(element));
    }
    updateScene = () => {
        if (!richMotionAllowed()) return;
        const measurements = sceneTargets.map(({ element, anchor, range }) => {
            const rect = anchor.getBoundingClientRect();
            const fraction = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight));
            return { element, value: (fraction * range).toFixed(2) };
        });
        measurements.forEach(({ element, value }) => element.style.setProperty("--scene-y", value + "px"));
    };

    let networkCanvas = null, networkContext = null;
    let networkFrame = 0, lastDraw = 0, networkFailed = false;
    let networkWidth = 0, networkHeight = 0;
    const particles = Array.from({ length: 26 }, () => ({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - .5) * .009,
        vy: (Math.random() - .5) * .012
    }));
    function sizeNetwork() {
        if (!networkCanvas) return;
        networkWidth = hero.clientWidth;
        networkHeight = hero.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1, 1.25);
        networkCanvas.width = Math.round(networkWidth * ratio);
        networkCanvas.height = Math.round(networkHeight * ratio);
        networkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function drawNetwork(time) {
        networkFrame = requestAnimationFrame(drawNetwork);
        if (time - lastDraw < 1000 / 24) return;
        const delta = Math.min((time - (lastDraw || time)) / 1000, .06);
        lastDraw = time;
        const ctx = networkContext;
        ctx.clearRect(0, 0, networkWidth, networkHeight);
        const light = root.dataset.theme === "light";
        const color = light ? "64,95,140" : "127,180,216";
        particles.forEach(point => {
            point.x += point.vx * delta;
            point.y += point.vy * delta;
            if (point.x < 0 || point.x > 1) point.vx *= -1;
            if (point.y < 0 || point.y > 1) point.vy *= -1;
            point.x = Math.max(0, Math.min(1, point.x));
            point.y = Math.max(0, Math.min(1, point.y));
        });
        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            const x = a.x * networkWidth, y = a.y * networkHeight;
            let connections = 0;
            for (let j = i + 1; j < particles.length && connections < 3; j++) {
                const b = particles[j];
                const dx = x - b.x * networkWidth, dy = y - b.y * networkHeight;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared > 180 * 180) continue;
                const alpha = (1 - Math.sqrt(distanceSquared) / 180) * .16;
                ctx.strokeStyle = "rgba(" + color + "," + alpha + ")";
                ctx.lineWidth = .6;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(b.x * networkWidth, b.y * networkHeight);
                ctx.stroke();
                connections++;
            }
            ctx.fillStyle = "rgba(" + color + ",.3)";
            ctx.beginPath();
            ctx.arc(x, y, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    syncNetwork = () => {
        const enabled = richMotionAllowed() && !document.hidden && !root.classList.contains("hero-paused") && !networkFailed;
        cancelAnimationFrame(networkFrame);
        networkFrame = 0;
        root.classList.toggle("network-running", enabled);
        if (!enabled) return;
        if (!networkCanvas) {
            networkCanvas = document.createElement("canvas");
            networkCanvas.className = "neural-canvas";
            networkCanvas.setAttribute("aria-hidden", "true");
            networkContext = networkCanvas.getContext("2d");
            if (!networkContext) {
                networkFailed = true;
                networkCanvas = null;
                root.classList.remove("network-running");
                return;
            }
            hero.prepend(networkCanvas);
            sizeNetwork();
        }
        lastDraw = 0;
        networkFrame = requestAnimationFrame(drawNetwork);
    };
    function configureScene() {
        if (!richMotionAllowed()) {
            dismissOpening();
            sceneTargets.forEach(({ element }) => element.style.removeProperty("--scene-y"));
        }
        sizeNetwork();
        syncNetwork();
        queueScroll();
    }
    finePointer.addEventListener("change", configureScene);
    noTouch.addEventListener("change", configureScene);
    reducedMotion.addEventListener("change", configureScene);
    if ("ResizeObserver" in window) new ResizeObserver(sizeNetwork).observe(hero);
    else window.addEventListener("resize", sizeNetwork, { passive: true });
    window.addEventListener("pagehide", () => {
        cancelAnimationFrame(networkFrame);
        stopPointer();
        dismissOpening();
    });
    window.addEventListener("pageshow", syncNetwork);
    configureScene();


    configurePointer();
    updatePageVisibility();
    document.getElementById("year").textContent = String(new Date().getFullYear());
})();

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
    const storageKey = "digambar-portfolio-theme";
    let explicitTheme = false;

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

    // One animation-frame update per scroll keeps the header and navigation in sync.
    let scrollQueued = false;
    function updateScrollState() {
        header.classList.toggle("scrolled", scrollY > 16);
        let current = null;
        const marker = Math.min(innerHeight * 0.35, 240);
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= marker) current = section.id;
        }
        if (scrollY + innerHeight >= root.scrollHeight - 5) current = "contact";
        navLinks.forEach(link => {
            const active = link.hash === "#" + current;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
        scrollQueued = false;
    }
    window.addEventListener("scroll", () => {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(updateScrollState);
        }
    }, { passive: true });
    window.addEventListener("resize", updateScrollState);
    updateScrollState();

    const reveals = [...document.querySelectorAll(".reveal")];
    const count = document.querySelector("[data-count]");
    let countStarted = false;
    function animateCount() {
        if (!count || countStarted) return;
        countStarted = true;
        const target = Number(count.dataset.count);
        if (reducedMotion.matches) return;
        const started = performance.now();
        function frame(now) {
            const progress = Math.min((now - started) / 800, 1);
            count.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
            if (progress < 1 && !reducedMotion.matches) requestAnimationFrame(frame);
            else count.textContent = String(target);
        }
        requestAnimationFrame(frame);
    }
    if ("IntersectionObserver" in window && !reducedMotion.matches) {
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.remove("reveal-pending");
                    if (entry.target.contains(count)) animateCount();
                    observer.unobserve(entry.target);
                }
            }
        }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
        reveals.forEach(element => {
            // Avoid hiding content already in view, including direct anchor visits.
            if (element.getBoundingClientRect().top >= innerHeight) element.classList.add("reveal-pending");
            observer.observe(element);
        });
        reducedMotion.addEventListener("change", event => {
            if (event.matches) {
                reveals.forEach(element => element.classList.remove("reveal-pending"));
                observer.disconnect();
            }
        });
    }
    document.getElementById("year").textContent = String(new Date().getFullYear());
})();


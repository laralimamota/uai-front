"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "@/config/navigation";
import UaiWordmark from "@/components/branding/UaiWordmark";

function isRouteActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

function NavigationLink({ href, label, active, onNavigate }) {
  return (
    <Link
      href={href}
      className={`nav-link text-start${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

function NavigationGroup({ items, depth = 0, pathname, onNavigate }) {
  return items.map((item) => {
    const active = isRouteActive(pathname, item.href);

    return (
      <div
        key={item.href}
        className={`sidebar-nav__item${depth > 0 ? " sidebar-nav__item--nested" : ""}`}
      >
        <NavigationLink
          href={item.href}
          label={item.label}
          active={active}
          onNavigate={onNavigate}
        />
        {item.children?.length ? (
          <div className="sidebar-nav__children nav flex-column gap-1">
            <NavigationGroup
              items={item.children}
              depth={depth + 1}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </div>
        ) : null}
      </div>
    );
  });
}

export default function SidebarNavigation({ onNavigate }) {
  const pathname = usePathname();

  const handleNavigate = () => {
    if (typeof onNavigate === "function") {
      onNavigate();
    }
  };

  return (
    <div className="sidebar-nav h-100 d-flex flex-column">
      <div className="sidebar-nav__brand px-3 py-4 border-bottom">
        <Link
          className="navbar-brand fw-bold fs-4"
          href="/"
          onClick={handleNavigate}
        >
          <UaiWordmark variant="compact" />
        </Link>
      </div>
      <nav className="nav nav-pills flex-column gap-1 px-3 py-4">
        <NavigationGroup
          items={primaryNavigation}
          pathname={pathname}
          onNavigate={handleNavigate}
        />
      </nav>
    </div>
  );
}

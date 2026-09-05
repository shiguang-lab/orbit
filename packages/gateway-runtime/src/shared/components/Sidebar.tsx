"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "../utils/cn.ts";
import { getActiveSidebarHref } from "../utils/sidebarRouteMatch.ts";
import { filterSidebarSectionsByQuery } from "../utils/sidebarSearch.ts";
import { APP_CONFIG } from "../constants/appConfig.ts";
import Button from "./Button";
import Input from "./Input";
import { ConfirmModal } from "./Modal";
import CloudSyncStatus from "./CloudSyncStatus";
import { useTranslations } from "next-intl";
import { ConfigProvider, Layout, Menu, type MenuProps } from "antd";
import {
  HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY,
  normalizeHiddenSidebarGroupLabels,
} from "../constants/sidebarGroupVisibility.ts";
import {
  HIDDEN_SIDEBAR_ITEMS_SETTING_KEY,
  SIDEBAR_SETTINGS_UPDATED_EVENT,
  SIDEBAR_SECTION_ORDER_KEY,
  SIDEBAR_ITEM_ORDER_KEY,
  SIDEBAR_SECTIONS,
  normalizeHiddenSidebarItems,
  applySectionOrder,
  applyItemOrder,
  getSidebarIconAccent,
  isSidebarItemVisibleForFlags,
  resolveRuntimeSidebarSections,
  type SidebarSectionId,
  type SidebarItemDefinition,
  type SidebarItemGroup,
  type SidebarItemOrder,
} from "../constants/sidebarVisibility.ts";

const isE2EMode = process.env.NEXT_PUBLIC_SHIGUANG_GATEWAY_E2E_MODE === "1";
const DEFAULT_EXPANDED: SidebarSectionId = "omni-proxy";
const EXPANDED_SECTIONS_KEY = "sidebar-expanded-sections";

type SidebarGlyphStyle = CSSProperties & {
  "--sidebar-icon-accent": string;
  color: string;
};

type SidebarProps = {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMacElectron?: boolean;
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Sidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
  isMacElectron = false,
}: SidebarProps) {
  const getIconStyle = (itemId: string): SidebarGlyphStyle => {
    const accent = getSidebarIconAccent(itemId);
    return {
      "--sidebar-icon-accent": accent,
      color: accent,
    };
  };
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
  const [hiddenSidebarGroupLabels, setHiddenSidebarGroupLabels] = useState<string[]>([]);
  // Feature-flag map for flag-gated items (e.g. "radar" -> RADAR_ENABLED).
  // Fails open (see isSidebarItemVisibleForFlags) so a missing key never
  // hides an unrelated item — only set once /api/settings resolves.
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [radarAdminUrl, setRadarAdminUrl] = useState<unknown>(null);
  const [sidebarSectionOrder, setSidebarSectionOrder] = useState<SidebarSectionId[]>([]);
  const [sidebarItemOrder, setSidebarItemOrder] = useState<SidebarItemOrder>({});
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([DEFAULT_EXPANDED]);
  const [sidebarExpansionLoaded, setSidebarExpansionLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load persisted open (expanded) sections on mount.
  useEffect(() => {
    const storedExpanded = loadFromStorage<string[]>(EXPANDED_SECTIONS_KEY, [DEFAULT_EXPANDED]);
    setExpandedSections(storedExpanded);
    setSidebarExpansionLoaded(true);
  }, []);

  useEffect(() => {
    const applySettings = (data) => {
      setShowDebug(data?.debugMode === true);
      setHiddenSidebarItems(normalizeHiddenSidebarItems(data?.[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]));
      setHiddenSidebarGroupLabels(
        normalizeHiddenSidebarGroupLabels(data?.[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
      );
      setCustomAppName(data?.instanceName || null);
      setCustomLogo(data?.customLogoBase64 || data?.customLogoUrl || null);
      if (typeof data?.radarEnabled === "boolean") {
        setFeatureFlags((prev) => ({ ...prev, RADAR_ENABLED: data.radarEnabled }));
      }
      setRadarAdminUrl(data?.radarAdminUrl ?? null);
    };

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        applySettings(data);
        if (Array.isArray(data?.[SIDEBAR_SECTION_ORDER_KEY])) {
          setSidebarSectionOrder(data[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
        }
        if (data?.[SIDEBAR_ITEM_ORDER_KEY] && typeof data[SIDEBAR_ITEM_ORDER_KEY] === "object") {
          setSidebarItemOrder(data[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
        }
      })
      .catch(() => {});

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      if ("debugMode" in detail) setShowDebug(detail.debugMode === true);
      if (HIDDEN_SIDEBAR_ITEMS_SETTING_KEY in detail) {
        setHiddenSidebarItems(
          normalizeHiddenSidebarItems(detail[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY])
        );
      }
      if (HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY in detail) {
        setHiddenSidebarGroupLabels(
          normalizeHiddenSidebarGroupLabels(detail[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
        );
      }
      if (SIDEBAR_SECTION_ORDER_KEY in detail && Array.isArray(detail[SIDEBAR_SECTION_ORDER_KEY])) {
        setSidebarSectionOrder(detail[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
      }
      if (
        SIDEBAR_ITEM_ORDER_KEY in detail &&
        detail[SIDEBAR_ITEM_ORDER_KEY] &&
        typeof detail[SIDEBAR_ITEM_ORDER_KEY] === "object"
      ) {
        setSidebarItemOrder(detail[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
      }
      if ("instanceName" in detail) setCustomAppName((detail.instanceName as string) || null);
      if ("customLogoBase64" in detail) {
        setCustomLogo((detail.customLogoBase64 as string) || null);
      } else if ("customLogoUrl" in detail) {
        setCustomLogo((detail.customLogoUrl as string) || null);
      }
    };

    window.addEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    return () =>
      window.removeEventListener(
        SIDEBAR_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated as EventListener
      );
  }, []);

  const getSidebarLabel = (key: string, fallback: string) =>
    typeof t.has === "function" && t.has(key) ? t(key) : fallback;

  const resolveItem = (item: SidebarItemDefinition, hidden: Set<string>) => {
    if (hidden.has(item.id)) return null;
    if (!isSidebarItemVisibleForFlags(item, featureFlags)) return null;
    const subtitle = item.subtitleKey
      ? getSidebarLabel(item.subtitleKey, item.subtitleFallback ?? "")
      : item.subtitleFallback;
    return {
      ...item,
      label: getSidebarLabel(item.i18nKey, item.labelFallback ?? item.id),
      subtitle: subtitle || undefined,
    };
  };

  const hiddenSidebarSet = new Set(hiddenSidebarItems);
  const hiddenSidebarGroupLabelsSet = new Set(hiddenSidebarGroupLabels);

  const runtimeSections = resolveRuntimeSidebarSections(SIDEBAR_SECTIONS, { radarAdminUrl });
  const orderedSections = applySectionOrder(
    runtimeSections.filter((section) => section.visibility !== "debug" || showDebug),
    sidebarSectionOrder
  );

  const visibleSections = orderedSections
    .map((section) => {
      const orderedChildren = applyItemOrder(
        section.children,
        sidebarItemOrder[section.id as SidebarSectionId] ?? []
      );

      const children = orderedChildren
        .map((child) => {
          if ("type" in child && child.type === "group") {
            const items = child.items
              .map((item) => resolveItem(item, hiddenSidebarSet))
              .filter(Boolean) as (SidebarItemDefinition & { label: string })[];
            if (items.length === 0) return null;
            // Smart-grouping: single visible item → inline flat (no group header)
            if (items.length === 1) return items[0];
            return {
              ...child,
              title: getSidebarLabel(child.titleKey, child.titleFallback),
              separatorHidden: hiddenSidebarGroupLabelsSet.has(child.id),
              items,
            } as SidebarItemGroup & {
              title: string;
              separatorHidden: boolean;
              items: (SidebarItemDefinition & { label: string })[];
            };
          }
          return resolveItem(child as SidebarItemDefinition, hiddenSidebarSet);
        })
        .filter(Boolean);

      return {
        ...section,
        title: getSidebarLabel(section.titleKey, section.titleFallback),
        children,
      };
    })
    .filter((section) => {
      const allItems = section.children.flatMap((child: any) =>
        child.type === "group" ? child.items : [child]
      );
      return allItems.length > 0;
    });

  const allVisibleItems = visibleSections.flatMap((section) =>
    section.children.flatMap((child: any) => (child.type === "group" ? child.items : [child]))
  );

  const activeHref = getActiveSidebarHref(pathname, allVisibleItems);

  const isSearching = searchQuery.trim().length > 0;
  const displaySections = isSearching
    ? filterSidebarSectionsByQuery(visibleSections, searchQuery)
    : visibleSections;

  // Ensure the section containing the active item stays open (standard Menu
  // behavior: navigating opens its SubMenu).
  useEffect(() => {
    if (collapsed || !sidebarExpansionLoaded) return;
    for (const section of visibleSections) {
      const sectionItems = section.children.flatMap((child: any) =>
        child.type === "group" ? child.items : [child]
      );
      if (sectionItems.some((item: any) => !item.external && item.href === activeHref)) {
        setExpandedSections((prev) =>
          prev.includes(section.id as string) ? prev : [...prev, section.id as string]
        );
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref, collapsed, sidebarExpansionLoaded]);

  // Open all sections while searching so matches are visible.
  const openKeys = isSearching ? displaySections.map((s) => s.id as string) : expandedSections;

  const handleOpenChange = useCallback((keys: string[]) => {
    setExpandedSections(keys);
    saveToStorage(EXPANDED_SECTIONS_KEY, keys);
  }, []);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch {
      // Expected to fail as server shuts down
    }
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch {
      // Expected to fail as server restarts
    }
    setIsRestarting(false);
    setShowRestartModal(false);
    setIsDisconnected(true);
    setTimeout(() => globalThis.location.reload(), 3000);
  };

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    const item = allVisibleItems.find((i: any) => i.href === key);
    if (!item) return;
    if (item.external) {
      globalThis.open(item.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.href);
    }
    onClose?.();
  };

  const renderMenuItem = (item: SidebarItemDefinition & { label: string; subtitle?: string }) => {
    const icon = (
      <span className="material-symbols-outlined sidebar-menu-icon" style={getIconStyle(item.id)}>
        {item.icon}
      </span>
    );
    const labelContent = (
      <>
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {!collapsed && item.subtitle && (
          <span className="block truncate text-[11px] leading-4 text-text-muted/65">
            {item.subtitle}
          </span>
        )}
      </>
    );
    const label = (
      <span className="flex min-w-0 flex-col">
        {item.external ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1"
            onClick={(event) => {
              // Let the anchor perform external navigation; the Menu handler
              // is reserved for clicks on the icon/row itself.
              event.stopPropagation();
              onClose?.();
            }}
          >
            {labelContent}
          </a>
        ) : (
          <Link
            href={item.href}
            prefetch={false}
            className="min-w-0 flex-1"
            onClick={(event) => {
              // Avoid issuing a second navigation from Menu.onClick.
              event.stopPropagation();
              onClose?.();
            }}
          >
            {labelContent}
          </Link>
        )}
      </span>
    );
    return {
      key: item.href,
      icon,
      label,
      // AntD uses this as the native tooltip while the menu is collapsed.
      title: item.label,
    } satisfies NonNullable<MenuProps["items"]>[number];
  };

  // Build a single standard Menu. Sections become SubMenus (collapsible),
  // section-internal groups become MenuItemGroups, flat items become items.
  const renderChildren = (section: (typeof displaySections)[number]) =>
    section.children.map((child: any) => {
      if (child.type !== "group") return renderMenuItem(child);
      return {
        key: child.id,
        type: "group" as const,
        label: child.separatorHidden ? null : child.title,
        children: child.items.map(renderMenuItem),
      };
    });

  const menuItems: NonNullable<MenuProps["items"]> = collapsed
    ? // In mini mode, keep every navigable item in the rail. Rendering the
      // sections as SubMenus here would leave their title-only rows without
      // icons, while AntD moves the actual entries into a hover popup.
      displaySections.reduce<NonNullable<MenuProps["items"]>>((acc, section) => {
        const items = section.children.flatMap((child: any) =>
          child.type === "group" ? child.items : [child]
        );
        return acc.concat(items.map(renderMenuItem));
      }, [])
    : displaySections.reduce<NonNullable<MenuProps["items"]>>((acc, section) => {
        // Sections without a visible title (e.g. Home) render items directly.
        if (section.showTitle === false) return acc.concat(renderChildren(section));
        return acc.concat({
          key: section.id as string,
          type: "submenu" as const,
          label: <span className="text-sm font-semibold">{section.title}</span>,
          children: renderChildren(section),
        });
      }, []);

  return (
    <>
      <ConfigProvider
        theme={{
          token: {
            colorBgContainer: "var(--color-sidebar)",
            colorText: "var(--color-text-main)",
            colorTextDescription: "var(--color-text-muted)",
            borderRadius: 8,
          },
          components: {
            Menu: {
              itemBg: "transparent",
              itemColor: "var(--color-text-muted)",
              itemHoverBg: "var(--color-surface)",
              itemHoverColor: "var(--color-text-main)",
              itemSelectedBg: "transparent",
              itemSelectedColor: "var(--color-primary)",
              groupTitleColor: "var(--color-text-muted)",
              itemHeight: 42,
              itemMarginBlock: 2,
              iconSize: 16,
              collapsedIconSize: 20,
            },
          },
        }}
      >
        <Layout.Sider
          ref={sidebarRef}
          collapsible={!!onToggleCollapse}
          collapsed={collapsed}
          collapsedWidth={64}
          width={260}
          trigger={onToggleCollapse ? undefined : null}
          onCollapse={() => onToggleCollapse?.()}
          className="sidebar-sider relative h-full min-h-0 border-r border-black/5 bg-sidebar transition-all duration-300 ease-in-out dark:border-white/5"
          style={{
            background: "var(--color-sidebar)",
            paddingTop: isMacElectron ? "var(--desktop-safe-top)" : undefined,
          }}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-primary focus:text-white focus:rounded-md focus:m-2"
          >
            {t("skipToContent")}
          </a>

          <div className={cn("relative", collapsed ? "px-2 pb-3 pt-4" : "px-4 pb-3 pt-4")}>
            <Link
              href="/home"
              prefetch={false}
              className={cn("flex min-w-0 items-center", collapsed ? "justify-center" : "gap-2.5")}
            >
              <div className="flex items-center justify-center size-8 rounded-lg overflow-hidden bg-[#05081a] shrink-0">
                <img
                  src={customLogo || APP_CONFIG.logoPath}
                  alt={customAppName || APP_CONFIG.name}
                  className="size-full object-cover"
                  onError={(event) => {
                    if (event.currentTarget.src.endsWith(APP_CONFIG.logoPath)) return;
                    event.currentTarget.src = APP_CONFIG.logoPath;
                  }}
                />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <h1 className="truncate text-base font-semibold tracking-tight text-text-main">
                    {customAppName || APP_CONFIG.name}
                  </h1>
                  <span className="text-xs text-text-muted">v{APP_CONFIG.version}</span>
                </div>
              )}
            </Link>
          </div>

          {!collapsed && (
            <div className="px-4 pb-2">
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tc("search")}
                aria-label={tc("search")}
                icon="search"
                className="gap-0"
                inputClassName="py-2 text-sm"
              />
            </div>
          )}

          <nav
            aria-label={t("mainNavigation")}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar",
              collapsed ? "px-2" : "px-3"
            )}
          >
            {isSearching && displaySections.length === 0 && (
              <p className="px-2 py-3 text-xs text-text-muted/60">{tc("noResults")}</p>
            )}
            <Menu
              mode="inline"
              selectable
              selectedKeys={activeHref ? [activeHref] : []}
              openKeys={openKeys}
              onOpenChange={handleOpenChange}
              items={menuItems}
              className="sidebar-menu"
              inlineCollapsed={collapsed}
              onClick={handleMenuClick}
            />
          </nav>

          {!isE2EMode && <CloudSyncStatus collapsed={collapsed} />}

          <div
            className={cn(
              "shrink-0 border-t border-black/5 dark:border-white/5",
              collapsed ? "p-2 flex flex-col gap-1" : "p-2 flex gap-2"
            )}
            style={{
              paddingBottom: isMacElectron
                ? "calc(0.5rem + var(--desktop-safe-bottom))"
                : undefined,
            }}
          >
            <button
              onClick={() => setShowRestartModal(true)}
              title={t("restart")}
              aria-label={t("restart")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
                "text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40",
                collapsed ? "p-2" : "min-w-0 flex-1 px-2 py-2 text-sm"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              {!collapsed && <span className="whitespace-nowrap">{t("restart")}</span>}
            </button>
            <button
              onClick={() => setShowShutdownModal(true)}
              title={t("shutdown")}
              aria-label={t("shutdown")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
                "text-red-500 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40",
                collapsed ? "p-2" : "min-w-0 flex-1 px-2 py-2 text-sm"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
              {!collapsed && <span className="whitespace-nowrap">{t("shutdown")}</span>}
            </button>
          </div>
        </Layout.Sider>
      </ConfigProvider>

      <ConfirmModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
        onConfirm={handleShutdown}
        title={t("shutdown")}
        message={t("shutdownConfirm")}
        confirmText={t("shutdown")}
        cancelText={tc("cancel")}
        variant="danger"
        loading={isShuttingDown}
      />

      <ConfirmModal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        onConfirm={handleRestart}
        title={t("restart")}
        message={t("restartConfirm")}
        confirmText={t("restart")}
        cancelText={tc("cancel")}
        variant="warning"
        loading={isRestarting}
      />

      {isDisconnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center p-8">
            <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">power_off</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("serverDisconnected")}</h2>
            <p className="text-text-muted mb-6">{t("serverDisconnectedMsg")}</p>
            <Button variant="secondary" onClick={() => globalThis.location.reload()}>
              {t("reloadPage")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

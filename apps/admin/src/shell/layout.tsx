/**
 * 应用外壳：antd Layout（Sider 菜单 + Header + Content/Outlet）。
 * 菜单图标与线上 OmniRoute Orbit 侧栏保持一致。
 */
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Dropdown,
  Avatar,
  Input,
  Tag,
  type MenuProps,
} from "antd";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV_SECTIONS, MaterialIcon, NavIcon, applySidebarSettings, flattenNav, localizeNav, navTitleForPath } from "@/app/nav";
import { useThemeMode } from "@/theme/useThemeMode";
import { useI18n, type AppLocale } from "@/i18n";
import { performLogout, getAuthSession } from "@/auth/session";
import { settingsApi } from "@/entities/api";
import { Scrollbar } from "@shiguang2/components/esm/scrollbar";
import { useBreadcrumbTitle } from "@/shell/useBreadcrumbTitle";

const { Sider, Header, Content } = Layout;

export function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const { locale, setLocale, t } = useI18n();
  const session = getAuthSession();
  const customTitle = useBreadcrumbTitle((s) => s.customTitle);
  const sidebarSettingsQuery = useQuery({
    queryKey: ["settings", "sidebar"],
    queryFn: () => settingsApi.sidebar(),
    staleTime: 60_000,
  });
  const navSections = useMemo(
    () => applySidebarSettings(localizeNav(NAV_SECTIONS, locale), sidebarSettingsQuery.data),
    [locale, sidebarSettingsQuery.data],
  );
  const visibleNavSections = useMemo(() => {
    const query = menuSearch.trim().toLocaleLowerCase();
    if (!query) return navSections;
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${section.title} ${item.label}`.toLocaleLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSearch, navSections]);

  const selectedKeys = useMemo(() => {
    const pathname = location.pathname;
    const flat = flattenNav(navSections);
    const hit = flat.find((item) => pathname.startsWith(item.to));
    return hit ? [hit.key] : [];
  }, [location.pathname, navSections]);

  const menuItems: MenuProps["items"] = visibleNavSections.map((section) => ({
    key: section.key,
    label: section.title,
    type: "group",
    children: section.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon ? <NavIcon name={item.icon} itemKey={item.key} /> : undefined,
    })),
  }));

  const userMenu: MenuProps["items"] = [
    {
      key: "logout",
      label: t("shell.logout"),
      icon: <MaterialIcon name="logout" />,
      onClick: () => {
        void performLogout();
      },
    },
  ];

  const title = navTitleForPath(location.pathname, navSections);

  const breadcrumbs = useMemo(() => {
    const pathname = location.pathname;
    const flat = flattenNav(navSections);

    // 1. Combos Control Center
    if (/^\/dashboard\/combos\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/combos");
      return [
        { label: parent ? parent.label : "组合", to: "/dashboard/combos" },
        { label: customTitle || "组合详情" },
      ];
    }

    // 2. Provider subpages
    if (pathname === "/dashboard/providers/new") {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "新建提供者" },
      ];
    }
    if (/^\/dashboard\/providers\/[^/]+\/connections\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "编辑提供者" },
      ];
    }
    if (/^\/dashboard\/providers\/[^/]+$/.test(pathname)) {
      const parent = flat.find((it) => it.to === "/dashboard/providers");
      return [
        { label: parent ? parent.label : "提供者", to: "/dashboard/providers" },
        { label: "提供者详情" },
      ];
    }

    // Exact match
    const exact = flat.find((it) => it.to === pathname);
    if (exact) {
      return [{ label: exact.label }];
    }

    // Prefix match
    for (const item of flat) {
      if (pathname.startsWith(item.to) && item.to !== "/" && item.to !== "/home") {
        return [{ label: item.label }];
      }
    }

    return [{ label: title }];
  }, [location.pathname, navSections, title]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={266}
          className="sidebar-sider"
      >
        <div className="sidebar-header" role="banner">
          <div className="sidebar-brand-mark" aria-hidden="true">
            <MaterialIcon name="hub" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-copy">
              <Typography.Text strong>智枢</Typography.Text>
              <Typography.Text type="secondary">{t("shell.brandSubtitle")}</Typography.Text>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="sidebar-menu-search">
            <Input
              allowClear
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              prefix={<MaterialIcon name="search" />}
              placeholder={t("shell.menuSearch")}
              aria-label={t("shell.menuSearch")}
            />
          </div>
        )}
        <Scrollbar
          className="sidebar-scrollbar"
          scrollX={false}
          style={{ flex: "1 1 0%", minHeight: 0, height: 0 }}
        >
          <Menu
            mode="inline"
            theme="dark"
            className="sidebar-menu"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => {
              const item = flattenNav(navSections).find((i) => i.key === key);
              if (item) navigate(item.to);
            }}
            style={{ borderInlineEnd: "none", background: "transparent" }}
          />
        </Scrollbar>
      </Sider>

      <Layout style={{ minHeight: 0 }}>
        <Header
          className="app-header"
        >
          <div className="app-header-left">
            <Button
              type="text"
              icon={<MaterialIcon name={collapsed ? "menu" : "menu_open"} />}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={t("shell.toggleSidebar")}
            />
            <div className="app-breadcrumb" aria-label={t("shell.currentLocation")}>
              {location.pathname === "/home" || location.pathname === "/" ? (
                <>
                  <MaterialIcon name="home" />
                  <span className="app-breadcrumb-current">{t("nav.item.home")}</span>
                  <Typography.Text type="secondary">{t("shell.homeWelcome")}</Typography.Text>
                </>
              ) : (
                <>
                  <Typography.Text type="secondary">{t("shell.dashboard")}</Typography.Text>
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span aria-hidden="true" style={{ opacity: 0.45 }}>›</span>
                      {crumb.to ? (
                        <Link to={crumb.to} style={{ color: "inherit", textDecoration: "none" }}>
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="app-breadcrumb-current">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="app-header-tools">
            <Input
              className="app-global-search"
              allowClear
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              prefix={<MaterialIcon name="search" />}
              placeholder={t("shell.globalSearch")}
              aria-label={t("shell.globalSearchLabel")}
              suffix={<Typography.Text type="secondary" style={{ fontSize: 11 }}>⌘K</Typography.Text>}
            />
            <Button
              type="text"
              icon={<MaterialIcon name={mode === "dark" ? "light_mode" : "dark_mode"} />}
              onClick={toggle}
              aria-label={t("shell.toggleTheme")}
            />
            <Dropdown
              menu={{
                selectedKeys: [locale],
                onClick: ({ key }) => setLocale(key as AppLocale),
                items: [
                  { key: "zh-CN", label: t("language.chinese") },
                  { key: "en-US", label: t("language.english") },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" icon={<MaterialIcon name="language" />} aria-label={t("language.switch")}>
                {locale === "zh-CN" ? "中文" : "EN"}
              </Button>
            </Dropdown>
            {session && (
              <Space>
                <Tag color="purple">{session.platformRoles.includes("system:admin") ? "system:admin" : "user"}</Tag>
                <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                  <Space style={{ cursor: "pointer" }}>
                    <Avatar size="small" icon={<MaterialIcon name="account_circle" />} />
                    <Typography.Text>{session.displayName}</Typography.Text>
                  </Space>
                </Dropdown>
              </Space>
            )}
          </div>
        </Header>

        <Content style={{ minHeight: 0 }}>
          <Scrollbar className="shell-content-scrollbar" scrollX={false} style={{ height: "100%", padding: 16 }}>
            <Outlet />
          </Scrollbar>
        </Content>
      </Layout>
    </Layout>
  );
}

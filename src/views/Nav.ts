import m from "mithril";
import "./Nav.css";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
  { href: "/players", icon: "🤖", label: "Players" },
  { href: "/rounds", icon: "🚀", label: "Rounds" },
  { href: "/standings", icon: "🏆", label: "Standings" },
];

export const Nav: m.Component = {
  view: () => {
    const currentRoute = m.route.get();

    return m(
      "nav",
      { "aria-label": "Main" },
      m(
        "ul",
        NAV_ITEMS.map((item) => {
          const active = currentRoute === item.href;
          return m(m.route.Link, {
            href: item.href,
            selector: "li",
            class: active ? "active" : "",
            "aria-current": active ? "page" : undefined,
          }, [
            m("span.icon", item.icon),
            m("small", item.label),
          ]);
        }),
      ),
    );
  },
};
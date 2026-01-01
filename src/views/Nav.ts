import m from "mithril";
import "./Nav.css";

export const Nav: m.Component = {
  view: () => {
    const currentRoute = m.route.get();
    
    return m(
      "nav",
      m(
        "ul",
        m(m.route.Link, {
          href: "/",
          selector: "li",
          class: currentRoute === "/" ? "active" : "",
        }, "🏠"),
        m(m.route.Link, {
          href: "/settings",
          selector: "li",
          class: currentRoute === "/settings" ? "active" : "",
        }, "⚙️"),
        m(m.route.Link, {
          href: "/players",
          selector: "li",
          class: currentRoute === "/players" ? "active" : "",
        }, "🤖"),
        m(m.route.Link, {
          href: "/rounds",
          selector: "li",
          class: currentRoute === "/rounds" ? "active" : "",
        }, "🚀"),
        m(m.route.Link, {
          href: "/standings",
          selector: "li",
          class: currentRoute === "/standings" ? "active" : "",
        }, "🏆"),
      ),
    );
  },
};

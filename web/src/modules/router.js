export function createRouter() {
  const state = { view: "home", params: {} };

  function setView(view, params = {}) {
    state.view = view;
    state.params = params;
    window.dispatchEvent(new CustomEvent("kd_router_change", { detail: { view, params } }));
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function init() {
    setView("home");
  }

  return {
    get view() {
      return state.view;
    },
    get params() {
      return state.params;
    },
    setView,
    init,
  };
}

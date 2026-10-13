from dashwire import Dashboard, slugify, state_from_structure


def make_dashboard() -> Dashboard:
    return Dashboard(id="demo", name="Demo", server_url="http://example.test/", token="t")


def test_slugify_matches_core() -> None:
    assert slugify("  Runtime Settings! ") == "runtime-settings"
    assert slugify("--A_b--") == "a-b"


def test_structure_matches_ts_sdk_shape() -> None:
    d = make_dashboard()
    with d.section("Runtime") as s:
        s.toggle("maintenance", label="Maintenance", value=False)
        s.number("uptime", label="Uptime", value=3, unit="s")
        s.select("region", label="Region", value="eu", options=["eu", {"label": "US", "value": "us"}])
        s.action("restart", label="Restart")
        s.terminal("logs", label="Logs")

    structure = d.get_structure()
    assert structure["projectId"] == "demo"
    assert structure["projectName"] == "Demo"
    section = structure["sections"][0]
    assert section["slug"] == "runtime"
    caps = {c["key"]: c for c in section["capabilities"]}

    assert caps["maintenance"] == {
        "key": "maintenance", "type": "toggle", "label": "Maintenance",
        "value": False, "writable": True, "path": "runtime.maintenance",
    }
    assert caps["uptime"]["writable"] is False  # no on_change -> read only
    assert "min" not in caps["uptime"]
    assert caps["region"]["options"] == [{"label": "eu", "value": "eu"}, {"label": "US", "value": "us"}]
    assert caps["logs"]["type"] == "logs"
    assert state_from_structure(structure) == {"runtime.maintenance": False, "runtime.uptime": 3, "runtime.region": "eu"}
    assert d.server_url == "http://example.test"


def test_commands_dispatch_to_handlers() -> None:
    d = make_dashboard()
    received = []
    executed = []
    with d.section("Runtime") as s:
        toggle = s.toggle("maintenance", label="Maintenance", value=False, on_change=received.append)
        s.action("restart", label="Restart", on_execute=lambda: executed.append(True))

    d._dispatch("runtime.maintenance", True)
    d._dispatch("runtime.restart", None)

    assert received == [True]
    assert toggle.value is True
    assert executed == [True]
    assert d._current_state() == {"runtime.maintenance": True}


def test_decorator_handler_and_listeners() -> None:
    d = make_dashboard()
    with d.section("Runtime") as s:
        slider = s.slider("workers", label="Workers", value=1, min=1, max=8)

    seen = []

    @slider.on_change
    def handle(value: float) -> None:
        seen.append(value)

    notified = []
    unsubscribe = d.subscribe(lambda: notified.append(1))
    d._dispatch("runtime.workers", 4)
    slider.set_value(5)  # not connected: no emit, but listeners still fire
    unsubscribe()
    d._dispatch("runtime.workers", 6)

    assert seen == [4, 6]
    assert len(notified) == 2
    assert slider.value == 6


def test_redefining_section_replaces_capabilities() -> None:
    d = make_dashboard()
    with d.section("Runtime") as s:
        s.toggle("a", label="A", value=True, on_change=lambda v: None)
    with d.section("Runtime") as s:
        s.toggle("b", label="B", value=True)

    caps = d.get_structure()["sections"][0]["capabilities"]
    assert [c["key"] for c in caps] == ["b"]
    assert "runtime.a" not in d._handlers
    assert d._current_state() == {"runtime.b": True}

//! Shared scrollbars: a 10 px transparent track and a 4 px rounded thumb.
//! Hover and dragging widen the thumb; scrolling uses the view's scroll handle.
use super::*;
use gpui_kit::Axis;

/// The gutter (`--scrollbar-size`).
pub(in crate::frontend) const SIZE: f32 = 10.;
/// The shortest thumb: Blink gives an auto-sized custom thumb the platform
/// scrollbar's thickness, 17 px on Windows.
const MIN_THUMB: f32 = 17.;
/// Chromium's page step, as a share of the visible length (`kFractionToStepWhenPaging`).
const PAGE: f32 = 0.875;
/// A held track press repeats after this, then at the repeat interval (Blink's
/// autoscroll timer, which a held spin button uses too).
pub(in crate::frontend) const REPEAT_DELAY: Duration = Duration::from_millis(250);
pub(in crate::frontend) const REPEAT_INTERVAL: Duration = Duration::from_millis(50);
/// Win11's overlay bars: scrolling or pointing at the bar holds it shown this
/// long after the last of it, then it fades away on its own.
pub(in crate::frontend) const HOLD: Duration = Duration::from_millis(1200);
/// The fade itself, drawn in `FADE_STEP` wakes.
const FADE: Duration = Duration::from_millis(250);
const FADE_STEP: Duration = Duration::from_millis(16);
/// A fade driver's wake budget: the first wake spends the hold's remainder,
/// then the fade's sleeps (16 ms steps, 16 of them over the 250 ms fade, the
/// last one short) and one more to draw the hidden bar.
const FADE_WAKES: usize = (FADE.as_millis() / FADE_STEP.as_millis()) as usize + 2;

thread_local! {
    static TRACE: Cell<Option<(Instant, Duration)>> = const { Cell::new(None) };
}

/// Test runs: every scrollbar prints its offset and thumb on each frame for `ms`.
pub(in crate::frontend) fn trace(ms: u64) {
    TRACE.set(Some((Instant::now(), Duration::from_millis(ms))));
}

/// Milliseconds into a running trace.
pub(in crate::frontend) fn trace_ms() -> Option<f64> {
    let (start, length) = TRACE.get()?;
    let elapsed = start.elapsed();
    (elapsed < length).then_some(elapsed.as_secs_f64() * 1000.)
}

/// The thumb's opacity: full while the pointer holds the thumb or a track
/// press pages, then full through `HOLD` after the last reveal and `FADE`
/// long on the way out.
fn alpha(shown_at: Option<Instant>, active: bool, now: Instant) -> f32 {
    if active {
        return 1.;
    }
    let Some(shown) = shown_at else { return 0. };
    let elapsed = now - shown;
    if elapsed <= HOLD {
        return 1.;
    }
    match FADE.checked_sub(elapsed - HOLD) {
        Some(left) => left.as_secs_f32() / FADE.as_secs_f32(),
        None => 0.,
    }
}

/// How long until the bar next needs a frame on its own: the rest of its
/// hold, or a fade step; `None` once it is hidden. While the pointer holds
/// the thumb the bar needs no timed frames — every state change repaints.
fn next_wake(shown_at: Option<Instant>, now: Instant) -> Option<Duration> {
    let shown = shown_at?;
    let elapsed = now - shown;
    if elapsed < HOLD {
        return Some(HOLD - elapsed);
    }
    FADE.checked_sub(elapsed - HOLD)
        .map(|left| left.min(FADE_STEP))
}

/// Whether this frame spawns a fade driver: only a bar already on its way out
/// (`alpha` up, no pointer hold). A held bar's driver would find itself done
/// on its first wake, hand the frame straight back, and be respawned every
/// frame after — the hold needs no timed frames.
fn spawns_driver(alpha: f32, active: bool) -> bool {
    alpha > 0. && !active
}

/// What a fade driver does on a wake.
#[derive(Debug, PartialEq)]
enum Fade {
    /// Sleep this long, then draw again.
    Wait(Duration),
    /// Hand the drive back: replaced, out of wake budget, held by the
    /// pointer, or faded away.
    Done,
}

/// One wake of the fade driver that owns `epoch` while `current` is the
/// state's, after `wakes` timers slept through.
fn fade_step(
    epoch: u64,
    current: u64,
    shown_at: Option<Instant>,
    active: bool,
    wakes: usize,
    now: Instant,
) -> Fade {
    if epoch != current || wakes >= FADE_WAKES || active {
        return Fade::Done;
    }
    match next_wake(shown_at, now) {
        Some(wait) => Fade::Wait(wait),
        None => Fade::Done,
    }
}

/// What the pointer is doing with a scrollbar, kept across frames.
#[derive(Default)]
struct BarState {
    hovered: bool,
    /// While the thumb is held: where in the thumb it was taken.
    grab: Option<Pixels>,
    /// Original offset of a direct touch drag, restored on cancellation.
    touch_start: Option<Point<Pixels>>,
    /// While the track is held: the pointer, and the repeating page steps.
    press: Option<(Point<Pixels>, Task<()>)>,
    /// The offset the last paint saw, to notice scrolling. `None` before the
    /// first one, so a restored position does not flash the bar.
    last_offset: Option<Pixels>,
    /// When the bar was last revealed by a scroll or the pointer; `None`
    /// while hidden.
    shown_at: Option<Instant>,
    /// Bumped whenever a fade driver is (re)spawned, so a stale one quits.
    fade_epoch: u64,
    /// The fade driver while one drives this bar, with its epoch.
    fade: Option<(u64, Task<()>)>,
    /// Whether the bar is shown, as the last paint judged it (the pointer's
    /// reveal reads it to notice it was hidden).
    visible: bool,
}

impl BarState {
    /// The pointer is holding the bar: parked on the thumb, dragging it, or
    /// holding a track press. A held bar stays fully shown and needs no timed
    /// frames — every state change repaints.
    fn active(&self) -> bool {
        self.hovered || self.grab.is_some() || self.press.is_some()
    }
}

/// The bar's geometry this frame.
#[derive(Clone, Copy)]
struct Geometry {
    axis: Axis,
    track: Bounds<Pixels>,
    thumb: Bounds<Pixels>,
    visible: Pixels,
    max: Pixels,
}

impl Geometry {
    fn along(&self, point: Point<Pixels>) -> Pixels {
        match self.axis {
            Axis::Vertical => point.y,
            Axis::Horizontal => point.x,
        }
    }

    fn start(&self, bounds: Bounds<Pixels>) -> Pixels {
        self.along(bounds.origin)
    }

    fn length(&self, bounds: Bounds<Pixels>) -> Pixels {
        match self.axis {
            Axis::Vertical => bounds.size.height,
            Axis::Horizontal => bounds.size.width,
        }
    }

    /// The scroll offset (positive, along the axis) that puts the thumb's start at `start`.
    fn offset_for_thumb(&self, start: Pixels) -> Pixels {
        let travel = self.length(self.track) - self.length(self.thumb);
        if travel <= px(0.) {
            return px(0.);
        }
        ((start - self.start(self.track)) / travel * self.max).clamp(px(0.), self.max)
    }
}

/// A scrollbar over the scroller that `handle` tracks.
pub(in crate::frontend) struct Scrollbar {
    id: ElementId,
    handle: ScrollHandle,
    axis: Axis,
    /// `::-webkit-scrollbar-track { margin }` at the track's start and end.
    margin: (Pixels, Pixels),
    /// The scroller's border, which the bar sits inside.
    border: Pixels,
    /// The view that paints the scrolled element, when another view paints the bar.
    view: Option<EntityId>,
    /// A horizontal bar in its own rail just below this scroller (the process
    /// table's `.hscroll`), rather than over the scroller's bottom edge.
    rail_below: Option<ScrollHandle>,
    dark: bool,
}

/// A vertical scrollbar for the scroller tracked by `handle`.
pub(in crate::frontend) fn scrollbar(
    id: impl Into<ElementId>,
    handle: &ScrollHandle,
    dark: bool,
) -> Scrollbar {
    Scrollbar {
        id: id.into(),
        handle: handle.clone(),
        axis: Axis::Vertical,
        margin: (px(0.), px(0.)),
        border: px(0.),
        view: None,
        rail_below: None,
        dark,
    }
}

impl Scrollbar {
    pub fn horizontal(mut self) -> Self {
        self.axis = Axis::Horizontal;
        self
    }

    /// Track margin at both ends (`::-webkit-scrollbar-track { margin: N 0 }`).
    pub fn track_margin(mut self, margin: f32) -> Self {
        self.margin = (px(margin), px(margin));
        self
    }

    /// The scroller's border width, which the gutter sits inside.
    pub fn border(mut self, width: f32) -> Self {
        self.border = px(width);
        self
    }

    /// The view to redraw when the bar scrolls, if not the one painting the bar.
    /// A horizontal bar in a rail of its own just below `above`'s scroller.
    pub fn rail_below(mut self, above: &ScrollHandle) -> Self {
        self.axis = Axis::Horizontal;
        self.rail_below = Some(above.clone());
        self
    }

    pub fn view(mut self, view: EntityId) -> Self {
        self.view = Some(view);
        self
    }

    fn geometry(&self) -> Option<Geometry> {
        let viewport = self.handle.bounds();
        let max = self.handle.max_offset();
        let offset = self.handle.offset();
        let border = self.border;
        let (length, max, offset) = match self.axis {
            Axis::Vertical => (viewport.size.height, max.y, -offset.y),
            Axis::Horizontal => (viewport.size.width, max.x, -offset.x),
        };
        // Chromium shows no bar for an overflow under half a pixel either.
        if max < px(0.5) || length <= px(0.) {
            return None;
        }
        let visible = length - border * 2.;
        let track = match self.axis {
            Axis::Vertical => Bounds::new(
                point(
                    viewport.right() - border - px(SIZE),
                    viewport.top() + border + self.margin.0,
                ),
                size(px(SIZE), visible - self.margin.0 - self.margin.1),
            ),
            Axis::Horizontal => Bounds::new(
                point(
                    viewport.left() + border + self.margin.0,
                    match &self.rail_below {
                        Some(above) => above.bounds().bottom(),
                        None => viewport.bottom() - border - px(SIZE),
                    },
                ),
                size(visible - self.margin.0 - self.margin.1, px(SIZE)),
            ),
        };
        let track_length = f32::from(match self.axis {
            Axis::Vertical => track.size.height,
            Axis::Horizontal => track.size.width,
        })
        .floor();
        if track_length <= 0. {
            return None;
        }
        // Blink: the thumb's share of the track is the visible share of the
        // content, rounded; its position is truncated, but never 0 once scrolled.
        let total = f32::from(visible + max);
        let thumb_length = (f32::from(visible) / total * track_length)
            .round()
            .max(MIN_THUMB)
            .min(track_length);
        let position = (f32::from(offset.clamp(px(0.), max)) * (track_length - thumb_length)
            / f32::from(max))
        .max(0.);
        let position = if position > 0. && position < 1. {
            1.
        } else {
            position.trunc()
        };
        let thumb = match self.axis {
            Axis::Vertical => Bounds::new(
                point(track.left(), track.top() + px(position)),
                size(px(SIZE), px(thumb_length)),
            ),
            Axis::Horizontal => Bounds::new(
                point(track.left() + px(position), track.top()),
                size(px(thumb_length), px(SIZE)),
            ),
        };
        Some(Geometry {
            axis: self.axis,
            track,
            thumb,
            visible,
            max,
        })
    }

    /// Notices scrolling and returns the thumb's opacity, leaving the reveal
    /// time and the shown judgement in `state` for the fade driver and the
    /// pointer handlers. The first paint only takes the measure: a bar over
    /// a restored offset shows nothing until something moves it.
    fn reveal(&self, state: &Rc<RefCell<BarState>>) -> f32 {
        let offset = match self.axis {
            Axis::Vertical => -self.handle.offset().y,
            Axis::Horizontal => -self.handle.offset().x,
        };
        let now = Instant::now();
        let mut bar = state.borrow_mut();
        match bar.last_offset {
            None => bar.last_offset = Some(offset),
            Some(previous) if previous != offset => {
                bar.last_offset = Some(offset);
                bar.shown_at = Some(now);
            }
            _ => {}
        }
        let alpha = alpha(bar.shown_at, bar.active(), now);
        bar.visible = alpha > 0.;
        alpha
    }
}

impl IntoElement for Scrollbar {
    type Element = Self;

    fn into_element(self) -> Self::Element {
        self
    }
}

pub(in crate::frontend) struct ScrollbarPrepaint {
    geometry: Geometry,
    hitbox: Hitbox,
    state: Rc<RefCell<BarState>>,
    alpha: f32,
}

impl Element for Scrollbar {
    type RequestLayoutState = ();
    type PrepaintState = Option<ScrollbarPrepaint>;

    fn id(&self) -> Option<ElementId> {
        Some(self.id.clone())
    }

    fn source_location(&self) -> Option<&'static std::panic::Location<'static>> {
        None
    }

    fn request_layout(
        &mut self,
        _: Option<&GlobalElementId>,
        _: Option<&InspectorElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> (LayoutId, Self::RequestLayoutState) {
        // No room taken, so the scrolled content's size is the content's own.
        let mut style = Style {
            position: Position::Absolute,
            ..Default::default()
        };
        style.inset.top = px(0.).into();
        style.inset.left = px(0.).into();
        style.size.width = px(0.).into();
        style.size.height = px(0.).into();
        (window.request_layout(style, None, cx), ())
    }

    fn prepaint(
        &mut self,
        id: Option<&GlobalElementId>,
        _: Option<&InspectorElementId>,
        _: Bounds<Pixels>,
        _: &mut Self::RequestLayoutState,
        window: &mut Window,
        _: &mut App,
    ) -> Self::PrepaintState {
        let state = window.with_element_state(id?, |state: Option<Rc<RefCell<BarState>>>, _| {
            let state = state.unwrap_or_default();
            (state.clone(), state)
        });
        let alpha = self.reveal(&state);
        if let Some(ms) = trace_ms() {
            let geometry = self.geometry();
            println!(
                "{}",
                json!({"event":"scroll","id":self.id.to_string(),"ms":ms,
                "offset":f32::from(-self.handle.offset().y),"max":f32::from(self.handle.max_offset().y),
                "view":f32::from(self.handle.bounds().size.height),
                "maxX":f32::from(self.handle.max_offset().x),"viewW":f32::from(self.handle.bounds().size.width),
                "offsetX":f32::from(-self.handle.offset().x),"alpha":alpha,
                "thumb":geometry.map(|g| [f32::from(g.thumb.left()), f32::from(g.thumb.top()), f32::from(g.thumb.size.width), f32::from(g.thumb.size.height)])})
            );
        }
        // A bar drawn by another view than its scroller's follows a glide on
        // its own: an isolated glide (`ScrollHandle::isolate_glides`) draws
        // only the cached view around the scroller, and the view drawing the
        // bar would replay. While the glide runs, the bar asks for that view's
        // next frame. The glide steps in the scroller's prepaint, before this
        // one (the bar comes after the list), so each frame shows its step.
        if self
            .view
            .is_some_and(|scroller| scroller != window.current_view())
            && self.handle.gliding()
        {
            window.request_isolated_animation_frame();
        }
        let Some(geometry) = self.geometry() else {
            // Nothing to scroll: a held thumb or track lets go. The epoch
            // count survives the reset, so a driver detached before it cannot
            // share an epoch with one spawned after and quash its slot.
            let epoch = state.borrow().fade_epoch;
            *state.borrow_mut() = BarState {
                fade_epoch: epoch,
                ..BarState::default()
            };
            return None;
        };
        // Over the bar the content gets no hover or clicks, but the wheel still scrolls it.
        let hitbox = window.insert_hitbox(geometry.track, HitboxBehavior::BlockMouseExceptScroll);
        Some(ScrollbarPrepaint {
            geometry,
            hitbox,
            state,
            alpha,
        })
    }

    fn paint(
        &mut self,
        _: Option<&GlobalElementId>,
        _: Option<&InspectorElementId>,
        _: Bounds<Pixels>,
        _: &mut Self::RequestLayoutState,
        prepaint: &mut Self::PrepaintState,
        window: &mut Window,
        cx: &mut App,
    ) {
        let Some(ScrollbarPrepaint {
            geometry,
            hitbox,
            state,
            alpha,
        }) = prepaint.take()
        else {
            return;
        };
        let active = state.borrow().active();
        // `border: 3px solid transparent` (2 px when active) with `border-radius:
        // 10px`, which CSS scales down to half the box's narrower side.
        let inset = px(if active { 2. } else { 3. });
        let thumb = geometry.thumb;
        let outer = (thumb.size.width.min(thumb.size.height) / 2.).min(px(10.));
        let fill = Bounds::new(
            thumb.origin + point(inset, inset),
            size(
                thumb.size.width - inset * 2.,
                thumb.size.height - inset * 2.,
            ),
        );
        let color = thumb_color(self.dark, active);
        let color = Hsla {
            a: color.a * alpha,
            ..color
        };
        if alpha > 0. && fill.size.width > px(0.) && fill.size.height > px(0.) {
            window
                .paint_quad(gpui_kit::fill(fill, color).corner_radii((outer - inset).max(px(0.))));
        }
        window.set_cursor_style(CursorStyle::Arrow, &hitbox);

        let painter = window.current_view();
        let scroller = self.view.unwrap_or(painter);
        let notify = move |cx: &mut App| {
            cx.notify(painter);
            if scroller != painter {
                cx.notify(scroller);
            }
        };
        // While the thumb is on its way out (the pointer's hold needs no timed
        // frames — every state change repaints), a driver wakes for the end of
        // the hold and each step of the fade, drawing as it goes. It spawns the
        // way a held track press's repeat does. A held bar spawns none.
        if spawns_driver(alpha, active) {
            let epoch = {
                let mut bar = state.borrow_mut();
                match &bar.fade {
                    Some((held, _)) if *held == bar.fade_epoch => None,
                    _ => {
                        bar.fade_epoch += 1;
                        Some(bar.fade_epoch)
                    }
                }
            };
            if let Some(epoch) = epoch {
                let task = {
                    let state = state.clone();
                    window.spawn(cx, async move |cx| {
                        let mut wakes = 0;
                        loop {
                            let wait = cx
                                .update(|_, cx| {
                                    let mut bar = state.borrow_mut();
                                    let active = bar.active();
                                    match fade_step(
                                        epoch,
                                        bar.fade_epoch,
                                        bar.shown_at,
                                        active,
                                        wakes,
                                        Instant::now(),
                                    ) {
                                        Fade::Wait(wait) => Some(wait),
                                        Fade::Done => {
                                            // A replaced driver just quits; the
                                            // one owning the slot hands it back
                                            // and draws the hidden bar.
                                            if bar.fade_epoch == epoch {
                                                bar.fade = None;
                                                notify(cx);
                                            }
                                            None
                                        }
                                    }
                                })
                                .unwrap_or(None);
                            let Some(wait) = wait else {
                                break;
                            };
                            cx.background_executor().timer(wait).await;
                            wakes += 1;
                            cx.update(|_, cx| notify(cx)).ok();
                        }
                    })
                };
                state.borrow_mut().fade = Some((epoch, task));
            }
        }
        let handle = self.handle.clone();
        let axis = geometry.axis;
        let set_along = move |handle: &ScrollHandle, value: Pixels| {
            let mut offset = handle.offset();
            match axis {
                Axis::Vertical => offset.y = -value,
                Axis::Horizontal => offset.x = -value,
            }
            handle.set_offset(offset);
        };

        window.on_mouse_event({
            let state = state.clone();
            let hitbox = hitbox.clone();
            let handle = handle.clone();
            move |event: &TouchDragEvent, phase, window, cx| {
                if phase != DispatchPhase::Bubble {
                    return;
                }
                let mut bar = state.borrow_mut();
                match event.phase {
                    TouchPhase::Started => {
                        if !hitbox.is_hovered(window)
                            || !geometry.thumb.contains(&event.start_position)
                        {
                            return;
                        }
                        bar.touch_start = Some(handle.offset());
                        bar.grab = Some(
                            geometry.along(event.start_position) - geometry.start(geometry.thumb),
                        );
                        bar.press = None;
                        window.prevent_default();
                    }
                    TouchPhase::Moved | TouchPhase::Ended if bar.touch_start.is_some() => {
                        let start = geometry.along(event.position) - bar.grab.unwrap_or_default();
                        set_along(&handle, geometry.offset_for_thumb(start));
                        if event.phase == TouchPhase::Ended {
                            bar.touch_start = None;
                            bar.grab = None;
                        }
                    }
                    TouchPhase::Cancelled if bar.touch_start.is_some() => {
                        handle.set_offset(bar.touch_start.take().unwrap());
                        bar.grab = None;
                    }
                    _ => return,
                }
                bar.hovered = false;
                notify(cx);
                cx.stop_propagation();
            }
        });

        window.on_mouse_event({
            let state = state.clone();
            let hitbox = hitbox.clone();
            let handle = handle.clone();
            move |event: &MouseMoveEvent, phase, window, cx| {
                if phase != DispatchPhase::Bubble {
                    return;
                }
                let mut state = state.borrow_mut();
                if state.touch_start.is_some() {
                    return;
                }
                if let Some(grab) = state.grab {
                    if event.pressed_button == Some(MouseButton::Left) {
                        let start = geometry.along(event.position) - grab;
                        set_along(&handle, geometry.offset_for_thumb(start));
                        notify(cx);
                        return;
                    }
                    state.grab = None;
                    notify(cx);
                }
                if let Some((pointer, _)) = state.press.as_mut() {
                    *pointer = event.position;
                }
                let over_track = hitbox.is_hovered(window);
                let hovered = over_track && geometry.thumb.contains(&event.position);
                // Over the strip the bar is revealed again; a move onto or off
                // the thumb starts a fresh hold.
                if over_track {
                    let hidden = !state.visible;
                    state.shown_at = Some(Instant::now());
                    state.visible = true;
                    if hidden {
                        notify(cx);
                    }
                }
                if hovered != state.hovered {
                    state.hovered = hovered;
                    state.shown_at = Some(Instant::now());
                    notify(cx);
                }
            }
        });

        window.on_mouse_event({
            let state = state.clone();
            let hitbox = hitbox.clone();
            let handle = handle.clone();
            move |event: &MouseDownEvent, phase, window, cx| {
                if phase != DispatchPhase::Bubble || !hitbox.is_hovered(window) {
                    return;
                }
                cx.stop_propagation();
                if event.button != MouseButton::Left {
                    return;
                }
                let mut bar = state.borrow_mut();
                if geometry.thumb.contains(&event.position) {
                    bar.grab =
                        Some(geometry.along(event.position) - geometry.start(geometry.thumb));
                    bar.hovered = true;
                    notify(cx);
                    return;
                }
                // A track press pages toward the pointer, then repeats while held
                // until the thumb reaches it.
                page_toward(&handle, geometry, event.position);
                notify(cx);
                let repeat = {
                    let state = state.clone();
                    let handle = handle.clone();
                    window.spawn(cx, async move |cx| {
                        cx.background_executor().timer(REPEAT_DELAY).await;
                        loop {
                            let pointer = state.borrow().press.as_ref().map(|(p, _)| *p);
                            let Some(pointer) = pointer else {
                                break;
                            };
                            let moved = cx
                                .update(|_, cx| {
                                    let moved = page_toward(&handle, geometry, pointer);
                                    if moved {
                                        notify(cx);
                                    }
                                    moved
                                })
                                .unwrap_or(false);
                            if !moved {
                                break;
                            }
                            cx.background_executor().timer(REPEAT_INTERVAL).await;
                        }
                    })
                };
                bar.press = Some((event.position, repeat));
            }
        });

        window.on_mouse_event({
            let state = state.clone();
            move |event: &MouseUpEvent, phase, window, cx| {
                if phase != DispatchPhase::Bubble || event.button != MouseButton::Left {
                    return;
                }
                let mut state = state.borrow_mut();
                if state.grab.is_none() && state.press.is_none() {
                    return;
                }
                state.grab = None;
                state.press = None;
                state.hovered =
                    hitbox.is_hovered(window) && geometry.thumb.contains(&event.position);
                // Let go, then fade: a release with nothing moved (a held
                // thumb) has revealed nothing on its own.
                state.shown_at = Some(Instant::now());
                state.visible = true;
                notify(cx);
            }
        });
    }
}

/// Pages toward `pointer` from where the offset is heading, unless the thumb
/// will already be under it. Returns whether it moved.
fn page_toward(handle: &ScrollHandle, geometry: Geometry, pointer: Point<Pixels>) -> bool {
    let target = handle.wheel_target();
    let target_along = match geometry.axis {
        Axis::Vertical => -target.y,
        Axis::Horizontal => -target.x,
    };
    // Where the thumb will be once the running page step lands.
    let travel = geometry.length(geometry.track) - geometry.length(geometry.thumb);
    let start = geometry.start(geometry.track)
        + if geometry.max > px(0.) {
            travel * (target_along / geometry.max).clamp(0., 1.)
        } else {
            px(0.)
        };
    let end = start + geometry.length(geometry.thumb);
    let at = geometry.along(pointer);
    let step = geometry.visible * PAGE;
    let next = if at < start {
        target_along - step
    } else if at >= end {
        target_along + step
    } else {
        return false;
    };
    let to = match geometry.axis {
        Axis::Vertical => point(target.x, -next),
        Axis::Horizontal => point(-next, target.y),
    };
    handle.glide_to(to)
}

fn thumb_color(dark: bool, active: bool) -> Hsla {
    thread_local! {
        static COLORS: RefCell<HashMap<(bool, bool), Hsla>> = RefCell::new(HashMap::new());
    }
    COLORS.with_borrow_mut(|colors| {
        *colors.entry((dark, active)).or_insert_with(|| {
            theme::token(
                if active {
                    "scroll-thumb-hover"
                } else {
                    "scroll-thumb"
                },
                dark,
            )
        })
    })
}

/// A scroll handle that lives as long as the program, for a scroller with a
/// fixed name whose builder has no window state to keep one in.
pub(in crate::frontend) fn keyed_handle(name: &str) -> ScrollHandle {
    thread_local! {
        static HANDLES: RefCell<HashMap<String, ScrollHandle>> = RefCell::new(HashMap::new());
    }
    HANDLES.with_borrow_mut(|handles| handles.entry(name.to_owned()).or_default().clone())
}

/// A scroll handle for a scroller that starts at the top again whenever
/// `generation` changes (another dialog, another step).
pub(in crate::frontend) fn fresh_handle(name: &'static str, generation: u64) -> ScrollHandle {
    thread_local! {
        static FRESH: RefCell<HashMap<&'static str, (u64, ScrollHandle)>> = RefCell::new(HashMap::new());
    }
    FRESH.with_borrow_mut(|handles| {
        let entry = handles
            .entry(name)
            .or_insert_with(|| (generation, ScrollHandle::new()));
        if entry.0 != generation {
            *entry = (generation, ScrollHandle::new());
        }
        entry.1.clone()
    })
}

/// Wheel notches over a scroller whose own wheel handling jumps (the tables'
/// virtual lists) glide instead, as everywhere else. Paint it before the
/// scroller: it takes the notch in the capture phase. `view` paints the scroller.
pub(in crate::frontend) fn wheel_glide(
    vertical: &ScrollHandle,
    horizontal: &ScrollHandle,
    view: EntityId,
) -> impl IntoElement {
    let vertical = vertical.clone();
    let horizontal = horizontal.clone();
    canvas(
        |bounds, window, _| window.insert_hitbox(bounds, HitboxBehavior::Normal),
        move |_, hitbox, window, _| {
            window.on_mouse_event(move |event: &ScrollEvent, phase, window, cx| {
                if phase != DispatchPhase::Capture
                    || event.touch_phase != TouchPhase::Moved
                    || !hitbox.should_handle_scroll(window)
                {
                    return;
                }
                let ScrollDelta::Lines(lines) = event.delta else {
                    return;
                };
                let (axis, lines) = wheel_axis(lines, event.modifiers.shift);
                let body = vertical.bounds();
                let header = horizontal.bounds();
                let rail = Bounds::new(
                    point(header.left(), body.bottom()),
                    size(header.size.width, px(SIZE)),
                );
                if !body.contains(&event.position)
                    && (axis == Axis::Vertical
                        || (!header.contains(&event.position) && !rail.contains(&event.position)))
                {
                    return;
                }
                let handle = if axis == Axis::Horizontal {
                    &horizontal
                } else {
                    &vertical
                };
                if lines.x == 0. && lines.y == 0. {
                    return;
                }
                if handle.scroll_by_lines(lines) {
                    cx.notify(view);
                    cx.stop_propagation();
                } else if handle.wheel_target() != handle.offset() {
                    // A notch past the edge while the glide is still on its way
                    // there belongs to the glide. Left to the table, its own
                    // wheel handling would jump by its line step and end the
                    // glide, short of the edge when that was farther away.
                    cx.stop_propagation();
                }
            });
        },
    )
    .absolute()
    .size_full()
}

fn wheel_axis(lines: Point<f32>, shift: bool) -> (Axis, Point<f32>) {
    // Windows already maps Shift+wheel to x. Synthetic and other platform events
    // can retain y, so only map it when x is empty.
    if shift && lines.x == 0. {
        (Axis::Horizontal, point(lines.y, 0.))
    } else if lines.x.abs() > lines.y.abs() {
        (Axis::Horizontal, point(lines.x, 0.))
    } else {
        (Axis::Vertical, point(0., lines.y))
    }
}

/// Gives the component library's own scrollbars (dialog bodies, popup lists)
/// the same look: always shown while the content overflows, the 4 px thumb in a
/// 10 px track that widens to 6 px at once under the pointer. Call after each
/// theme change, which rebuilds the library theme.
pub(in crate::frontend) fn style_library(dark: bool, cx: &mut App) {
    use gpui_kit::base::{ScrollbarMode, ScrollbarMotion, ScrollbarStyles, ScrollbarTheme};
    let normal = thumb_color(dark, false);
    let active = thumb_color(dark, true);
    let none = gpui_kit::transparent_black();
    gpui_kit::base::Theme::global_mut(cx).scrollbar = ScrollbarTheme::new()
        .with_mode(ScrollbarMode::Always)
        .with_motion(
            ScrollbarMotion::default()
                .with_enter(Duration::ZERO)
                .with_exit(Duration::ZERO)
                .with_expand(Duration::ZERO),
        )
        .with_styles(
            ScrollbarStyles::default()
                .track(|t| t.bg(none).border_color(none).width(px(SIZE)))
                .track_hover(|t| t.bg(none).border_color(none).width(px(SIZE)))
                .track_active(|t| t.bg(none).border_color(none).width(px(SIZE)))
                .thumb(|t| {
                    t.bg(normal)
                        .width(px(4.))
                        .inset(px(3.))
                        .radius(px(2.))
                        .min_length(px(MIN_THUMB))
                })
                .thumb_hover(|t| {
                    t.bg(active)
                        .width(px(6.))
                        .inset(px(2.))
                        .radius(px(3.))
                        .min_length(px(MIN_THUMB))
                })
                .thumb_active(|t| {
                    t.bg(active)
                        .width(px(6.))
                        .inset(px(2.))
                        .radius(px(3.))
                        .min_length(px(MIN_THUMB))
                }),
        );
}

#[cfg(test)]
mod wheel_tests {
    use super::{Axis, point, wheel_axis};
    #[test]
    fn horizontal_wheels_and_shift_wheels_keep_their_direction() {
        assert_eq!(
            wheel_axis(point(0., -3.), true),
            (Axis::Horizontal, point(-3., 0.))
        );
        assert_eq!(
            wheel_axis(point(3., 0.), true),
            (Axis::Horizontal, point(3., 0.))
        );
        assert_eq!(
            wheel_axis(point(-3., 0.), false),
            (Axis::Horizontal, point(-3., 0.))
        );
        assert_eq!(
            wheel_axis(point(0., -3.), false),
            (Axis::Vertical, point(0., -3.))
        );
    }
}

#[cfg(test)]
mod fade_tests {
    use super::{
        BarState, FADE, FADE_STEP, FADE_WAKES, Fade, HOLD, alpha, fade_step, next_wake, point, px,
        spawns_driver,
    };
    use std::time::{Duration, Instant};

    #[test]
    fn the_thumb_is_full_right_after_a_scroll_and_while_the_pointer_holds_it() {
        let now = Instant::now();
        assert_eq!(alpha(Some(now), false, now), 1.);
        assert_eq!(alpha(None, true, now), 1.);
    }

    #[test]
    fn the_thumb_fades_through_the_fade_after_the_hold() {
        let now = Instant::now();
        let shown = |before: Duration| now.checked_sub(before).unwrap();
        // The hold keeps it full, then the fade interpolates to gone.
        assert_eq!(alpha(Some(shown(HOLD)), false, now), 1.);
        assert_eq!(alpha(Some(shown(HOLD + FADE / 2)), false, now), 0.5);
        assert_eq!(alpha(Some(shown(HOLD + FADE * 2)), false, now), 0.);
        // Never revealed, nothing to show.
        assert_eq!(alpha(None, false, now), 0.);
    }

    #[test]
    fn the_driver_holds_then_steps_then_quits() {
        let now = Instant::now();
        let shown = |before: Duration| now.checked_sub(before).unwrap();
        assert_eq!(next_wake(Some(now), now), Some(HOLD));
        assert_eq!(next_wake(Some(shown(HOLD)), now), Some(FADE_STEP));
        // A hair past the fade's end (clock rounding), nothing left to wake for.
        assert_eq!(
            next_wake(Some(shown(HOLD + FADE + Duration::from_millis(1))), now),
            None
        );
    }

    #[test]
    fn a_replaced_driver_quits_without_handing_back() {
        let now = Instant::now();
        // The state's epoch moved on: the stale driver is done wherever its
        // slot has been taken over.
        assert_eq!(fade_step(1, 2, Some(now), false, 0, now), Fade::Done);
        assert_eq!(fade_step(2, 2, Some(now), false, 0, now), Fade::Wait(HOLD));
    }

    #[test]
    fn the_wake_budget_ends_a_driver_that_never_finishes() {
        let now = Instant::now();
        let shown = |before: Duration| now.checked_sub(before).unwrap();
        assert_eq!(
            fade_step(0, 0, Some(shown(HOLD)), false, FADE_WAKES - 1, now),
            Fade::Wait(FADE_STEP)
        );
        assert_eq!(
            fade_step(0, 0, Some(shown(HOLD)), false, FADE_WAKES, now),
            Fade::Done
        );
    }

    #[test]
    fn the_pointer_holding_the_thumb_needs_no_timed_frames() {
        let now = Instant::now();
        assert_eq!(fade_step(0, 0, Some(now), true, 0, now), Fade::Done);
    }

    #[test]
    fn a_parked_pointer_keeps_the_bar_full_and_spawns_no_driver() {
        let now = Instant::now();
        let shown = |before: Duration| now.checked_sub(before).unwrap();
        // Parked on the thumb past every deadline, the hold keeps the bar full.
        assert_eq!(alpha(Some(shown(HOLD + FADE * 2)), true, now), 1.);
        // Such a frame spawns no driver: it would wake at once, find itself
        // done, hand the frame back, and be respawned every frame.
        assert!(!spawns_driver(1., true));
        // Let go, and the fade drives; hidden or absent, nothing drives.
        assert!(spawns_driver(1., false));
        assert!(!spawns_driver(0., false));
    }

    #[test]
    fn a_held_track_press_keeps_the_bar_shown() {
        let now = Instant::now();
        let long_past = now.checked_sub(HOLD + FADE * 2).unwrap();
        let mut bar = BarState::default();
        assert!(!bar.active());
        // Paging landed the thumb under a still-held press: nothing moved and
        // nothing hovers, yet the bar must not fade away under the button.
        bar.press = Some((point(px(0.), px(0.)), gpui_kit::Task::ready(())));
        assert!(bar.active());
        assert_eq!(alpha(bar.shown_at, bar.active(), long_past), 1.);
        // Letting go starts the fade clock.
        bar.press = None;
        assert!(!bar.active());
        assert_eq!(alpha(bar.shown_at, bar.active(), long_past), 0.);
    }
}

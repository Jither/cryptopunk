const SHOW_DURATION = 1000;

const CLASS_CONTENT = "jsb-content";
const CLASS_SCROLL_CONTENT = "jsb-scroll-content";
const CLASS_BAR = "jsb-bar";
const CLASS_THUMB = "jsb-thumb";
const HORIZONTAL = "horizontal";
const VERTICAL = "vertical";

const ATTRIBUTES = {
	horizontal: {
		offset: "left",
		styleSize: "width",
		size: "offsetWidth",
		scrollOffset: "scrollLeft",
		scrollSize: "scrollWidth"
	},
	vertical: {
		offset: "top",
		styleSize: "height",
		size: "offsetHeight",
		scrollOffset: "scrollTop",
		scrollSize: "scrollHeight"
	}
};

function getNativeScrollBarWidth()
{
	const testBox = document.createElement("div");
	const style = testBox.style;

	style.position = "absolute";
	style.left = style.top = "-9999px";
	style.width = style.height = "80px";
	style.overflow = "scroll";

	document.body.appendChild(testBox);
	
	const result = testBox.offsetWidth - testBox.clientWidth;
	
	document.body.removeChild(testBox);

	return result;
}

class ScrollBar
{
	constructor(element)
	{
		this.element = element;
		this.barRequired = {};
		this.dragOrigin = {};

		if (getNativeScrollBarWidth() === 0)
		{
			// Browser has a native floating scroll bar (e.g. iOS, Android)
			this.element.style.scroll = "auto";
			return;
		}

		this.setupDom();
		this.resizeContent();
		this.resize(HORIZONTAL);
		this.resize(VERTICAL);

		this.showListener = this.show.bind(this);
		this.horizontalDragListener = this.startDrag.bind(this, HORIZONTAL);
		this.verticalDragListener = this.startDrag.bind(this, VERTICAL);
		this.doDragListener = this.doDrag.bind(this);
		this.endDragListener = this.endDrag.bind(this);
		this.startScrollListener = this.startScroll.bind(this);

		this.addListeners();
	}

	setupDom()
	{
		if (this.element.querySelectorAll("." + CLASS_CONTENT).length > 0)
		{
			return;
		}

		// Create wrappers
		const scrollContent = this.eleScrollContent = document.createElement("div");
		const content = this.eleContent = document.createElement("div");

		scrollContent.classList.add(CLASS_SCROLL_CONTENT);
		content.classList.add(CLASS_CONTENT);

		// Move all elements to content wrapper
		while (this.element.childNodes.length > 0)
		{
			content.appendChild(this.element.childNodes[0]);
		}

		scrollContent.appendChild(content);
		this.element.appendChild(scrollContent);

		[this.barX, this.thumbX] = this.createBar(HORIZONTAL);
		[this.barY, this.thumbY] = this.createBar(VERTICAL);
	}

	addListeners()
	{
		this.element.addEventListener("mouseenter", this.showListener);

		this.thumbX.addEventListener("mousedown", this.horizontalDragListener);
		this.thumbY.addEventListener("mousedown", this.verticalDragListener);

		this.eleScrollContent.addEventListener("scroll", this.startScrollListener);
	}

	removeListeners()
	{
		this.element.removeEventListener("mouseenter", this.showListener);
		
		this.thumbX.removeEventListener("mousedown", this.horizontalDragListener);
		this.thumbY.removeEventListener("mousedown", this.verticalDragListener);

		this.eleScrollContent.removeEventListener("scroll", this.startScrollListener);
	}

	createBar(direction)
	{
		const bar = document.createElement("div");
		const thumb = document.createElement("div");

		bar.classList.add(CLASS_BAR);
		bar.classList.add(direction);
		thumb.classList.add(CLASS_THUMB);

		bar.appendChild(thumb);

		this.element.insertBefore(bar, this.element.firstChild);

		return [bar, thumb];
	}

	resize(direction)
	{
		let bar, thumb;

		const attrs = ATTRIBUTES[direction];

		if (direction === HORIZONTAL)
		{
			bar = this.barX;
			thumb = this.thumbX;
		}
		else
		{
			bar = this.barY;
			thumb = this.thumbY;
		}

		const
			contentSize = this.eleContent[attrs.scrollSize],
			scrollOffset = this.eleScrollContent[attrs.scrollOffset],
			barSize = bar[attrs.size],
			ratio = barSize / contentSize,
			thumbOffset = Math.round(ratio * scrollOffset) + 2,
			thumbSize = Math.floor(ratio * (barSize - 2)) - 2;

		const required = this.barRequired[direction] = barSize < contentSize;

		bar.style.visibility = required ? "visible" : "hidden";

		if (required)
		{
			thumb.style[attrs.offset] = thumbOffset + "px";
			thumb.style[attrs.styleSize] = thumbSize + "px";
		}
	}

	resizeContent()
	{
		const nativeWidth = getNativeScrollBarWidth();
		const style = this.eleScrollContent.style;

		if (this.eleContent.scrollWidth <= this.element.offsetWidth)
		{
			if (this.eleContent.scrollHeight <= this.element.offsetHeight)
			{
				style.width = "auto";
				style.height = "auto";
			}
			else
			{
				style.width = (this.element.offsetWidth + nativeWidth) + "px";
				style.height = (this.element.offsetHeight) + "px";
			}
		}
		else
		{
			if (this.eleContent.scrollHeight <= this.element.offsetHeight)
			{
				style.width = "auto";
				style.height = (this.element.offsetHeight + nativeWidth) + "px";
			}
			else
			{
				style.width = (this.element.offsetWidth + nativeWidth) + "px";
				style.height = (this.element.offsetHeight + nativeWidth) + "px";
			}
		}
	}

	startScroll()
	{
		this.show();
	}

	startDrag(direction, event)
	{
		event.preventDefault();

		const thumb = direction === VERTICAL ? this.thumbY : this.thumbX;
		const offset = direction === VERTICAL ? event.pageY : event.pageX;
		const attrs = ATTRIBUTES[direction];

		const clientRect = thumb.getBoundingClientRect();
		this.dragOrigin[direction] = offset - clientRect[attrs.offset];
		this.currentDirection = direction;

		document.addEventListener("mousemove", this.doDragListener);
		document.addEventListener("mouseup", this.endDragListener);
	}

	doDrag(event)
	{
		event.preventDefault();

		const direction = this.currentDirection;

		const offset = direction === VERTICAL ? event.pageY : event.pageX;
		const bar = direction === VERTICAL ? this.barY : this.barX;
		const attrs = ATTRIBUTES[direction];

		const clientRect = bar.getBoundingClientRect();
		const dragPosition = offset - clientRect[attrs.offset] - this.dragOrigin[direction];

		const dragPct = dragPosition / bar[attrs.size];
		const scrollPosition = dragPct * this.eleContent[attrs.scrollSize];

		this.eleScrollContent[attrs.scrollOffset] = scrollPosition;
	}

	endDrag()
	{
		document.removeEventListener("mousemove", this.doDragListener);
		document.removeEventListener("mouseup", this.endDragListener);
	}

	show()
	{
		this.resize(HORIZONTAL);
		this.resize(VERTICAL);
		this.showBar(HORIZONTAL);
		this.showBar(VERTICAL);
	}

	showBar(direction)
	{
		if (!this.barRequired[direction])
		{
			return;
		}

		if (direction === HORIZONTAL)
		{
			this.thumbX.classList.add("visible");
		}
		else
		{
			this.thumbY.classList.add("visible");
		}

		if (this.showTimeout)
		{
			clearTimeout(this.showTimeout);
		}

		this.showTimeout = setTimeout(this.hide.bind(this), SHOW_DURATION);
	}

	hide()
	{
		if (this.showTimeout)
		{
			clearTimeout(this.showTimeout);
		}

		this.thumbX.classList.remove("visible");
		this.thumbY.classList.remove("visible");
	}

	invalidate()
	{
		this.resizeContent();
		this.resize(HORIZONTAL);
		this.resize(VERTICAL);
	}
}

export {
	ScrollBar
};
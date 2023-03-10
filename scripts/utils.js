const PARAMS = {
    scrollTo: {
        vertical: true,
        horizontal: false,
        xVal: 0,
        type: 0, // 0 = percentage, 1 = px.
    },
}

const utils = {
    private: {
        initParams: (params, originalParams) => {
            for (key in originalParams) {
                if (!Object.keys(params).includes(key)) {
                    params[key] = originalParams[key];
                }
            }
            return params;
        },
    },
    frontEnd: {
        intoView: (element, container) => { // True iff `element` is entirely visible within `container`.
            const eRect = element.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            return eRect.top >= cRect.top && eRect.bottom <= cRect.bottom;
        },
        scrollTo: (element, yVal, params = PARAMS.scrollTo) => { // Scrolls `element` by yVal (percentage, by default).
            params = utils.private.initParams(params, PARAMS.scrollTo);
            if (params.type === 0) {
                const st = element.scrollTop;
                const ch = element.clientHeight;
                const yPx = st + yVal * ch;
                element.scrollTo(params.xVal, yPx);
            }
        },
    },
}
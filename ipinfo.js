const $rnd = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const $v = (props, name, deflt) => {
    if (props == null || props == undefined) return deflt;
    if (typeof (props) != 'object' && typeof (props) != 'function') return deflt;
    if (!props.hasOwnProperty(name)) return deflt;
    return props[name];
}

const $e = React.createElement;
const $f = React.Fragment;
const $key = (key) => ({ key: key || $rnd() })
const $b = ReactBootstrap;



const IPInfo = (props) => {
    /* init call */
    if (props instanceof HTMLElement) {
        ReactDOM.render($e(IPInfo), props);
        return true
    }

    /* logic */
    const [busy, setBusy] = React.useState(false)
    const [ips, setIps] = React.useState([])
    const [ipData, setIpData] = React.useState(null)

    const hasResult = () => ipData && ipData.length

    const onRun = async (ips) => {
        setIps(ips)
        if (!ips && !ips.length) return
        setBusy(true)
        const data = await IPInfo.loadInfo(ips)
        setIpData(data)
        setBusy(false)
    }

    /* render */
    let opts = {
        ...props,
        onRun,
        busy,
        ips,
        ipData
    }
    return $e($f, $key(),
        $e(IPInfo.Header, opts),
        $e(IPInfo.Form, opts),
        !hasResult() ? null : $e(IPInfo.Result, opts),
    )
}



IPInfo.Result = (props) => {
    const groups = IPInfo.groupByISP(props.ipData)


    const onClickRow = (ev) => {
        let block = ev.target.closest('.ip')
        const copy = ev.target.closest('.fa-copy')
        if (block || copy) return
        block = ev.target.closest('tr').getElementsByClassName('ip')[0]
        block.classList.toggle('d-none')
    }


    return $e('div', { className: 'my-5' },
        $e($b.Table, { size: 'sm', striped: true },
            $e('tbody', null,
                groups.map(group => $e('tr', { key: group.name, onClick: onClickRow },
                    $e('td', null, group.name,
                        $e('div', { className: 'small text-muted d-none ip' },
                            group.ip.map(item => $e('div', $key(), item.query))
                        )),
                    $e('td', null, group.ip.length),
                    $e('td', null,
                        $e(CopyToClipboard, { className: 'ml-3', value: group.ip.map(item => item.query).join(' \n') })
                    )
                ))
            )
        )
    )
}




IPInfo.Form = (props) => {
    const [ips, setIps] = React.useState(props.ips || [])
    const [srcRows, setSrcRows] = React.useState(0)
    const [defaultText, setDefaultText] = React.useState(props.ips ? props.ips.join('\n') : '')
    const inputElement = React.useRef(null)


    const [semfirst, setsemfirst] = React.useState(true)
    React.useEffect(() => { // on first
        updateInfo(defaultText)
    }, [semfirst])

    const onSubmit = (ev) => {
        ev.preventDefault()
        props.onRun(ips)
    }

    const updateInfo = (srcText) => {
        const list = IPInfo.prepareList(srcText)
        setIps(list)

        setSrcRows(srcText
            .split(/\n/g)
            .filter(item => item.trim().length > 0)
            .length
        )
    }

    const onChangeQuery = (ev) => {
        updateInfo(ev.target.closest('textarea').value)
    }

    const onClickInfoBtn = (ev) => {
        const cleanText = ips.join('\n')
        inputElement.current.value = cleanText
        updateInfo(cleanText)
    }


    return $e($b.Form, {
        onSubmit
    },
        $e($b.Form.Group, null,
            $e($b.Form.Control, {
                ref: inputElement,
                as: 'textarea',
                placeholder: 'list of addresses (one per line)',
                rows: 15,
                style: { fontSize: '0.8rem' },
                onChange: onChangeQuery,
                defaultValue: defaultText
            })
        ),
        $e($b.Form.Group, { className: 'mt-3' },
            $e($b.Button, {
                type: "submit", size: "lg", className: 'px-5',
                disabled: props.busy || !ips.length
            },
                props.busy ? $e(Spinner) : 'Run'
            ),
            $e($b.Button, {
                variant: 'link', size: 'sm',
                className: 'text-muted ml-3 d-inline-block align-middle text-left',
                onClick: onClickInfoBtn
            },
                $e('span', null, `Source rows: ${srcRows}`),
                $e('br'),
                $e('span', null, `Parsed IPs from text: ${ips.length}`),
            )
        )
    )
}


IPInfo.Header = (props) => {
    return $e($f, $key(),
        $e('h3', { className: 'mb-3' },
            $e('span', null, 'IP Info'),
            $e('span', { className: 'text-muted ml-1', style: { fontSize: '0.7rem', fontWeight: 'normal' } },
                ' via ',
                $e('a', { target: '_blank', href: 'https://ip-api.com' }, 'ip-api.com')
            )
        )
    )
}



IPInfo.prepareList = (text) => {
    text += ''
    const list = text
        .split(/\n/g)
        .map(item => item.replace(/[;:a-zA-Z]/g, '').trim())
        .filter(item => item.length && item.match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/))
    return list
}


IPInfo.groupByISP = (ipdata) => {
    if (!ipdata && !ipdata.length) return null
    const groups = []
    ipdata.forEach(item => {
        let isp = item.isp ? item.isp : item.org
        if (!isp) isp = "Undefined"
        group = groups.find(g => g.name == isp)
        if (!group) {
            group = {
                name: isp,
                ip: []
            }
            groups.push(group)
        }
        item['ispname'] = isp
        group.ip.push(item)
    })
    return groups.sort((a, b) => a.name.localeCompare(b.name))
}


IPInfo.loadInfo = async (ips) => {
    const url = "https://ip-api.com/batch"
    let prms = {
        method: 'POST',
        body: JSON.stringify(
            ips.map(item => {
                return {
                    query: item,
                    fields: "country,isp,org,query"
                }
            })
        )
    }
    let data = null
    let response = await fetch(url, prms)
    console.log('ip-api response', response)
    if (response.ok) {
        data = await response.json()
        console.log('ip-api data', data)
    }
    return data
}

/** components **/

const Spinner = (props) => {
    let opts = {
        variant: 'dark',
        size: 'sm',
        animation: 'border',
        className: (props.className || '') + ' ' + (props.children ? 'mr-2 ' : ''),
        ...props,
        children: null
    }
    if (props.children) return $e($f, $key(),
        $e($b.Spinner, opts),
        props.children
    )
    return $e($b.Spinner, opts);
}


const CopyToClipboard = (props) => {
    const [inputId, setInputId] = React.useState('cpytxtinp-' + (props.id || $rnd()));

    const styles = {
        input: {
            padding: 0,
            width: '1px',
            fontSize: '1px',
            display: 'inline',
            border: 'none',
            color: 'transparent',
            backgroundColor: 'transparent'
        }
    }

    const onClick = (event) => {
        if (event) event.preventDefault();
        const inp = document.getElementById(inputId);
        inp.focus();
        inp.select();
        document.execCommand("copy");
        inp.blur();
        if (props.onClick) {
            props.onClick(event, inp.value)
        } else if (!props.children) {
            const btn = event.target.closest('.fa-copy')
            btn.classList.add('text-success')
            setTimeout(() => {
                btn.classList.remove('text-success')
             }, 300)
        }
    }

    const aOpts = {
        className: props.className || '',
        id: props.id || null,
        onClick: onClick,
        style: props.style || null
    }

    return $e($f, { key: props.key || props.id || props.name || $rnd() },
        $e('textarea', {
            id: inputId,
            style: styles.input,
            value: props.value,
            onChange: (event) => { event.preventDefault(); }
        }),
        props.children ?
            $e('a', aOpts, props.children) :
            $e('i', { ...aOpts, className: aOpts.className + ' far fa-copy' }, props.text || null),
    )
}




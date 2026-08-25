// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _8: x0 => x0.arrayBuffer(),
      _9: (x0,x1,x2) => x0.slice(x1,x2),
      _10: (x0,x1) => x0.decode(x1),
      _11: (x0,x1) => x0.segment(x1),
      _12: () => new TextDecoder(),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _135: (x0,x1) => x0.appendChild(x1),
      _166: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _167: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _168: (x0,x1) => new OffscreenCanvas(x0,x1),
      _169: x0 => x0.remove(),
      _170: (x0,x1) => x0.append(x1),
      _172: x0 => x0.unlock(),
      _173: x0 => x0.getReader(),
      _174: (x0,x1) => x0.item(x1),
      _175: x0 => x0.next(),
      _176: x0 => x0.now(),
      _177: (x0,x1) => x0.revokeObjectURL(x1),
      _178: x0 => x0.close(),
      _179: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _180: x0 => new window.ImageDecoder(x0),
      _181: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _182: (x0,x1) => x0.decode(x1),
      _183: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._183(f,arguments.length,x0) }),
      _184: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _186: (x0,x1) => x0.getModifierState(x1),
      _187: x0 => x0.preventDefault(),
      _188: x0 => x0.stopPropagation(),
      _189: (x0,x1) => x0.removeProperty(x1),
      _190: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._190(f,arguments.length,x0) }),
      _191: x0 => new window.FinalizationRegistry(x0),
      _192: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _194: (x0,x1) => x0.unregister(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.replaceWith(x1),
      _214: (x0,x1) => x0.contains(x1),
      _215: (x0,x1) => x0.closest(x1),
      _653: x0 => new Uint8Array(x0),
      _656: () => globalThis.window.flutterConfiguration,
      _658: x0 => x0.assetBase,
      _663: x0 => x0.canvasKitMaximumSurfaces,
      _664: x0 => x0.debugShowSemanticsNodes,
      _665: x0 => x0.hostElement,
      _666: x0 => x0.multiViewEnabled,
      _667: x0 => x0.nonce,
      _669: x0 => x0.fontFallbackBaseUrl,
      _679: x0 => x0.console,
      _680: x0 => x0.devicePixelRatio,
      _681: x0 => x0.document,
      _682: x0 => x0.history,
      _683: x0 => x0.innerHeight,
      _684: x0 => x0.innerWidth,
      _685: x0 => x0.location,
      _686: x0 => x0.navigator,
      _687: x0 => x0.visualViewport,
      _688: x0 => x0.performance,
      _689: x0 => x0.parent,
      _691: x0 => x0.URL,
      _693: (x0,x1) => x0.getComputedStyle(x1),
      _694: x0 => x0.screen,
      _695: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._695(f,arguments.length,x0) }),
      _696: (x0,x1) => x0.requestAnimationFrame(x1),
      _700: (x0,x1) => x0.warn(x1),
      _702: (x0,x1) => x0.debug(x1),
      _703: x0 => globalThis.parseFloat(x0),
      _704: () => globalThis.window,
      _705: () => globalThis.Intl,
      _706: () => globalThis.Symbol,
      _707: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _709: x0 => x0.clipboard,
      _710: x0 => x0.maxTouchPoints,
      _711: x0 => x0.vendor,
      _712: x0 => x0.language,
      _713: x0 => x0.platform,
      _714: x0 => x0.userAgent,
      _715: (x0,x1) => x0.vibrate(x1),
      _716: x0 => x0.languages,
      _717: x0 => x0.documentElement,
      _718: (x0,x1) => x0.querySelector(x1),
      _719: (x0,x1) => x0.querySelectorAll(x1),
      _721: (x0,x1) => x0.createElement(x1),
      _724: (x0,x1) => x0.createEvent(x1),
      _725: x0 => x0.activeElement,
      _728: x0 => x0.head,
      _729: x0 => x0.body,
      _731: (x0,x1) => { x0.title = x1 },
      _734: x0 => x0.visibilityState,
      _735: () => globalThis.document,
      _736: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._736(f,arguments.length,x0) }),
      _737: (x0,x1) => x0.dispatchEvent(x1),
      _745: x0 => x0.target,
      _747: x0 => x0.timeStamp,
      _748: x0 => x0.type,
      _750: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _757: x0 => x0.firstChild,
      _761: x0 => x0.parentElement,
      _763: (x0,x1) => { x0.textContent = x1 },
      _764: x0 => x0.parentNode,
      _765: x0 => x0.nextSibling,
      _766: (x0,x1) => x0.removeChild(x1),
      _767: x0 => x0.isConnected,
      _775: x0 => x0.clientHeight,
      _776: x0 => x0.clientWidth,
      _777: x0 => x0.offsetHeight,
      _778: x0 => x0.offsetWidth,
      _779: x0 => x0.id,
      _780: (x0,x1) => { x0.id = x1 },
      _783: (x0,x1) => { x0.spellcheck = x1 },
      _784: x0 => x0.tagName,
      _785: x0 => x0.style,
      _787: (x0,x1) => x0.querySelectorAll(x1),
      _788: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _789: x0 => x0.tabIndex,
      _790: (x0,x1) => { x0.tabIndex = x1 },
      _791: (x0,x1) => x0.focus(x1),
      _792: x0 => x0.scrollTop,
      _793: (x0,x1) => { x0.scrollTop = x1 },
      _794: (x0,x1) => { x0.scrollLeft = x1 },
      _795: x0 => x0.scrollLeft,
      _796: x0 => x0.classList,
      _797: (x0,x1) => x0.scrollIntoView(x1),
      _800: (x0,x1) => { x0.className = x1 },
      _802: (x0,x1) => x0.getElementsByClassName(x1),
      _803: x0 => x0.click(),
      _804: (x0,x1) => x0.attachShadow(x1),
      _807: x0 => x0.computedStyleMap(),
      _808: (x0,x1) => x0.get(x1),
      _814: (x0,x1) => x0.getPropertyValue(x1),
      _815: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _816: x0 => x0.offsetLeft,
      _817: x0 => x0.offsetTop,
      _818: x0 => x0.offsetParent,
      _820: (x0,x1) => { x0.name = x1 },
      _821: x0 => x0.content,
      _822: (x0,x1) => { x0.content = x1 },
      _826: (x0,x1) => { x0.src = x1 },
      _827: x0 => x0.naturalWidth,
      _828: x0 => x0.naturalHeight,
      _832: (x0,x1) => { x0.crossOrigin = x1 },
      _834: (x0,x1) => { x0.decoding = x1 },
      _835: x0 => x0.decode(),
      _840: (x0,x1) => { x0.nonce = x1 },
      _845: (x0,x1) => { x0.width = x1 },
      _847: (x0,x1) => { x0.height = x1 },
      _850: (x0,x1) => x0.getContext(x1),
      _918: x0 => x0.width,
      _919: x0 => x0.height,
      _921: (x0,x1) => x0.fetch(x1),
      _922: x0 => x0.status,
      _924: x0 => x0.body,
      _925: x0 => x0.arrayBuffer(),
      _928: x0 => x0.read(),
      _929: x0 => x0.value,
      _930: x0 => x0.done,
      _937: x0 => x0.name,
      _938: x0 => x0.x,
      _939: x0 => x0.y,
      _942: x0 => x0.top,
      _943: x0 => x0.right,
      _944: x0 => x0.bottom,
      _945: x0 => x0.left,
      _955: x0 => x0.height,
      _956: x0 => x0.width,
      _957: x0 => x0.scale,
      _958: (x0,x1) => { x0.value = x1 },
      _961: (x0,x1) => { x0.placeholder = x1 },
      _963: (x0,x1) => { x0.name = x1 },
      _964: x0 => x0.selectionDirection,
      _965: x0 => x0.selectionStart,
      _966: x0 => x0.selectionEnd,
      _969: x0 => x0.value,
      _971: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _972: x0 => x0.readText(),
      _973: (x0,x1) => x0.writeText(x1),
      _975: x0 => x0.altKey,
      _976: x0 => x0.code,
      _977: x0 => x0.ctrlKey,
      _978: x0 => x0.key,
      _979: x0 => x0.keyCode,
      _980: x0 => x0.location,
      _981: x0 => x0.metaKey,
      _982: x0 => x0.repeat,
      _983: x0 => x0.shiftKey,
      _984: x0 => x0.isComposing,
      _986: x0 => x0.state,
      _987: (x0,x1) => x0.go(x1),
      _989: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _990: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _991: x0 => x0.pathname,
      _992: x0 => x0.search,
      _993: x0 => x0.hash,
      _997: x0 => x0.state,
      _1000: (x0,x1) => x0.createObjectURL(x1),
      _1002: x0 => new Blob(x0),
      _1012: x0 => x0.matches,
      _1016: x0 => x0.matches,
      _1020: x0 => x0.relatedTarget,
      _1022: x0 => x0.clientX,
      _1023: x0 => x0.clientY,
      _1024: x0 => x0.offsetX,
      _1025: x0 => x0.offsetY,
      _1028: x0 => x0.button,
      _1029: x0 => x0.buttons,
      _1030: x0 => x0.ctrlKey,
      _1034: x0 => x0.pointerId,
      _1035: x0 => x0.pointerType,
      _1036: x0 => x0.pressure,
      _1037: x0 => x0.tiltX,
      _1038: x0 => x0.tiltY,
      _1039: x0 => x0.getCoalescedEvents(),
      _1042: x0 => x0.deltaX,
      _1043: x0 => x0.deltaY,
      _1044: x0 => x0.wheelDeltaX,
      _1045: x0 => x0.wheelDeltaY,
      _1046: x0 => x0.deltaMode,
      _1053: x0 => x0.changedTouches,
      _1056: x0 => x0.clientX,
      _1057: x0 => x0.clientY,
      _1060: x0 => x0.data,
      _1063: (x0,x1) => { x0.disabled = x1 },
      _1065: (x0,x1) => { x0.type = x1 },
      _1066: (x0,x1) => { x0.max = x1 },
      _1067: (x0,x1) => { x0.min = x1 },
      _1068: x0 => x0.value,
      _1069: (x0,x1) => { x0.value = x1 },
      _1070: x0 => x0.disabled,
      _1071: (x0,x1) => { x0.disabled = x1 },
      _1073: (x0,x1) => { x0.placeholder = x1 },
      _1075: (x0,x1) => { x0.name = x1 },
      _1076: (x0,x1) => { x0.autocomplete = x1 },
      _1078: x0 => x0.selectionDirection,
      _1079: x0 => x0.selectionStart,
      _1081: x0 => x0.selectionEnd,
      _1084: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1085: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1095: (x0,x1) => x0.getContext(x1),
      _1097: x0 => x0.convertToBlob(),
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1186: () => globalThis.window.FinalizationRegistry,
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1285: (x0,x1) => x0.getElementById(x1),
      _1288: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1294: x0 => x0.getVideoTracks(),
      _1297: (x0,x1) => x0.append(x1),
      _1300: x0 => x0.remove(),
      _1302: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1303: (x0,x1) => x0.appendChild(x1),
      _1313: (x0,x1) => x0.createElement(x1),
      _1314: x0 => x0.click(),
      _1317: x0 => globalThis.URL.revokeObjectURL(x0),
      _1318: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      _1320: x0 => globalThis.URL.createObjectURL(x0),
      _1323: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1323(f,arguments.length,x0) }),
      _1324: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1324(f,arguments.length,x0) }),
      _1325: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1325(f,arguments.length,x0) }),
      _1326: (x0,x1) => x0.querySelector(x1),
      _1327: (x0,x1) => x0.replaceChildren(x1),
      _1328: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1328(f,arguments.length,x0) }),
      _1329: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1329(f,arguments.length,x0) }),
      _1330: x0 => x0.getCapabilities(),
      _1331: () => ({}),
      _1332: (x0,x1) => x0.applyConstraints(x1),
      _1333: x0 => x0.enumerateDevices(),
      _1334: x0 => x0.getSupportedConstraints(),
      _1335: x0 => ({ideal: x0}),
      _1336: (x0,x1,x2) => ({width: x0,height: x1,deviceId: x2}),
      _1337: x0 => ({video: x0}),
      _1338: (x0,x1) => ({width: x0,height: x1}),
      _1339: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      _1340: (x0,x1) => x0.getUserMedia(x1),
      _1341: x0 => x0.getSettings(),
      _1342: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1342(f,arguments.length,x0) }),
      _1343: (x0,x1) => x0.removeChild(x1),
      _1344: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1344(f,arguments.length,x0) }),
      _1346: x0 => x0.play(),
      _1347: x0 => ({willReadFrequently: x0}),
      _1348: (x0,x1,x2) => x0.getContext(x1,x2),
      _1349: (x0,x1,x2,x3,x4) => x0.getImageData(x1,x2,x3,x4),
      _1350: (x0,x1,x2) => x0.readBarcodes(x1,x2),
      _1351: (x0,x1,x2,x3) => ({formats: x0,tryHarder: x1,tryRotate: x2,tryInvert: x3}),
      _1352: (x0,x1,x2) => ({tryHarder: x0,tryRotate: x1,tryInvert: x2}),
      _1353: (x0,x1) => x0.detect(x1),
      _1354: () => new BarcodeDetector(),
      _1355: x0 => ({formats: x0}),
      _1356: x0 => new BarcodeDetector(x0),
      _1357: () => new Map(),
      _1358: (x0,x1,x2) => x0.set(x1,x2),
      _1359: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1359(f,arguments.length,x0,x1) }),
      _1360: (x0,x1) => x0.call(x1),
      _1361: (x0,x1) => new ZXing.BrowserMultiFormatReader(x0,x1),
      _1363: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1364: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1370: x0 => ({type: x0}),
      _1371: (x0,x1) => new Blob(x0,x1),
      _1372: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _1373: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1373(f,arguments.length,x0) }),
      _1374: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1383: () => new FileReader(),
      _1384: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1406: (x0,x1) => x0.item(x1),
      _1407: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1407(f,arguments.length,x0) }),
      _1408: (x0,x1) => x0.getItem(x1),
      _1409: (x0,x1) => x0.removeItem(x1),
      _1410: (x0,x1,x2) => x0.setItem(x1,x2),
      _1412: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1412(f,arguments.length,x0) }),
      _1413: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1413(f,arguments.length,x0) }),
      _1414: x0 => x0.exitFullscreen(),
      _1415: x0 => x0.requestFullscreen(),
      _1416: (x0,x1) => x0.querySelector(x1),
      _1417: () => globalThis.ZXingWASM,
      _1418: x0 => x0.text,
      _1419: x0 => x0.format,
      _1420: x0 => x0.bytes,
      _1421: x0 => x0.position,
      _1422: x0 => x0.isValid,
      _1423: x0 => x0.topLeft,
      _1424: x0 => x0.topRight,
      _1425: x0 => x0.bottomRight,
      _1426: x0 => x0.bottomLeft,
      _1427: x0 => x0.x,
      _1428: x0 => x0.y,
      _1429: x0 => x0.barcodeFormat,
      _1430: x0 => x0.text,
      _1431: x0 => x0.rawBytes,
      _1432: x0 => x0.resultPoints,
      _1434: Date.now,
      _1436: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1437: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1438: () => typeof dartUseDateNowForTicks !== "undefined",
      _1439: () => 1000 * performance.now(),
      _1440: () => Date.now(),
      _1441: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1442: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1443: () => new WeakMap(),
      _1444: (map, o) => map.get(o),
      _1445: (map, o, v) => map.set(o, v),
      _1446: x0 => new WeakRef(x0),
      _1447: x0 => x0.deref(),
      _1454: () => globalThis.WeakRef,
      _1458: s => JSON.stringify(s),
      _1459: s => printToConsole(s),
      _1460: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1461: (o, p, r) => o.replaceAll(p, () => r),
      _1462: (o, p, r) => o.replace(p, () => r),
      _1463: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1464: s => s.toUpperCase(),
      _1465: s => s.trim(),
      _1466: s => s.trimLeft(),
      _1467: s => s.trimRight(),
      _1468: (string, times) => string.repeat(times),
      _1469: Function.prototype.call.bind(String.prototype.indexOf),
      _1470: (s, p, i) => s.lastIndexOf(p, i),
      _1471: (string, token) => string.split(token),
      _1472: Object.is,
      _1476: (o, t) => typeof o === t,
      _1477: (o, c) => o instanceof c,
      _1478: o => Object.keys(o),
      _1531: x0 => new Array(x0),
      _1533: x0 => x0.length,
      _1535: (x0,x1) => x0[x1],
      _1536: (x0,x1,x2) => { x0[x1] = x2 },
      _1539: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1541: x0 => new Int8Array(x0),
      _1542: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1544: x0 => new Uint8ClampedArray(x0),
      _1546: x0 => new Int16Array(x0),
      _1548: x0 => new Uint16Array(x0),
      _1550: x0 => new Int32Array(x0),
      _1552: x0 => new Uint32Array(x0),
      _1554: x0 => new Float32Array(x0),
      _1556: x0 => new Float64Array(x0),
      _1580: x0 => x0.random(),
      _1581: (x0,x1) => x0.getRandomValues(x1),
      _1582: () => globalThis.crypto,
      _1583: () => globalThis.Math,
      _1596: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1597: (handle) => clearTimeout(handle),
      _1598: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1599: (handle) => clearInterval(handle),
      _1600: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1601: () => Date.now(),
      _1602: () => new Error().stack,
      _1603: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1604: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1605: (x0,x1) => x0.exec(x1),
      _1606: (x0,x1) => x0.test(x1),
      _1607: x0 => x0.pop(),
      _1609: o => o === undefined,
      _1611: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1613: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1614: o => o instanceof RegExp,
      _1615: (l, r) => l === r,
      _1616: o => o,
      _1617: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1618: o => o,
      _1619: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1620: o => o,
      _1621: b => !!b,
      _1622: o => o.length,
      _1624: (o, i) => o[i],
      _1625: f => f.dartFunction,
      _1626: () => ({}),
      _1627: () => [],
      _1629: () => globalThis,
      _1630: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1631: (o, p) => p in o,
      _1632: (o, p) => o[p],
      _1633: (o, p, v) => o[p] = v,
      _1634: (o, m, a) => o[m].apply(o, a),
      _1636: o => String(o),
      _1637: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1638: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1638(f,arguments.length,x0) }),
      _1639: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1639(f,arguments.length,x0,x1) }),
      _1640: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _1641: o => [o],
      _1642: (o0, o1) => [o0, o1],
      _1643: (o0, o1, o2) => [o0, o1, o2],
      _1644: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1645: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _1646: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1647: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1648: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1649: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1650: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1651: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1652: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1653: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1654: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1655: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1656: x0 => new ArrayBuffer(x0),
      _1657: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1659: x0 => x0.index,
      _1660: x0 => x0.groups,
      _1661: x0 => x0.flags,
      _1662: x0 => x0.multiline,
      _1663: x0 => x0.ignoreCase,
      _1664: x0 => x0.unicode,
      _1665: x0 => x0.dotAll,
      _1666: (x0,x1) => { x0.lastIndex = x1 },
      _1667: (o, p) => p in o,
      _1668: (o, p) => o[p],
      _1669: (o, p, v) => o[p] = v,
      _1678: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1678(f,arguments.length,x0) }),
      _1679: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1679(f,arguments.length,x0) }),
      _1680: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1680(f,arguments.length,x0) }),
      _1681: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1681(f,arguments.length,x0) }),
      _1682: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1682(f,arguments.length,x0) }),
      _1683: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1683(f,arguments.length,x0) }),
      _1684: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1684(f,arguments.length,x0) }),
      _1685: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1685(f,arguments.length,x0) }),
      _1686: x0 => x0.close(),
      _1688: (x0,x1) => x0.createOffer(x1),
      _1689: (x0,x1) => x0.createAnswer(x1),
      _1692: (x0,x1) => ({type: x0,sdp: x1}),
      _1693: (x0,x1) => x0.setLocalDescription(x1),
      _1694: (x0,x1) => ({type: x0,sdp: x1}),
      _1695: (x0,x1) => x0.setRemoteDescription(x1),
      _1703: (x0,x1,x2,x3) => ({ordered: x0,protocol: x1,negotiated: x2,id: x3}),
      _1704: (x0,x1,x2) => x0.createDataChannel(x1,x2),
      _1714: (x0,x1) => { x0.binaryType = x1 },
      _1717: x0 => new RTCPeerConnection(x0),
      _1734: x0 => globalThis.Object.keys(x0),
      _1736: x0 => new Date(x0),
      _1738: x0 => x0.getTime(),
      _1739: x0 => x0.length,
      _1740: x0 => x0.message,
      _1741: x0 => x0.name,
      _1775: (x0,x1) => x0.get(x1),
      _1779: (x0,x1,x2) => x0.put(x1,x2),
      _1780: (x0,x1) => x0.delete(x1),
      _1789: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1789(f,arguments.length,x0) }),
      _1790: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1790(f,arguments.length,x0) }),
      _1791: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1791(f,arguments.length,x0) }),
      _1792: (x0,x1) => x0.objectStore(x1),
      _1794: (x0,x1) => ({keyPath: x0,autoIncrement: x1}),
      _1795: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      _1796: (x0,x1,x2) => x0.transaction(x1,x2),
      _1797: x0 => x0.close(),
      _1800: (x0,x1,x2) => x0.open(x1,x2),
      _1814: (x0,x1) => x0.item(x1),
      _1815: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1815(f,arguments.length,x0) }),
      _1816: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1816(f,arguments.length,x0) }),
      _1824: (x0,x1,x2,x3) => ({name: x0,iv: x1,additionalData: x2,tagLength: x3}),
      _1825: x0 => globalThis.window.crypto.getRandomValues(x0),
      _1854: x0 => x0.arrayBuffer(),
      _1860: () => new XMLHttpRequest(),
      _1861: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1865: x0 => x0.send(),
      _1867: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1867(f,arguments.length,x0) }),
      _1868: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1868(f,arguments.length,x0) }),
      _1877: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1877(f,arguments.length,x0) }),
      _1878: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1878(f,arguments.length,x0) }),
      _1879: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1879(f,arguments.length,x0) }),
      _1880: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1880(f,arguments.length,x0) }),
      _1881: (x0,x1) => x0.send(x1),
      _1882: x0 => x0.close(),
      _1883: (x0,x1) => new WebSocket(x0,x1),
      _1884: x0 => x0.close(),
      _1885: (x0,x1) => x0.send(x1),
      _1886: x0 => new ClipboardItem(x0),
      _1887: (x0,x1) => x0.write(x1),
      _1901: x0 => x0.attachStreamToVideo,
      _1903: x0 => x0.decodeContinuously,
      _1907: x0 => x0.reset,
      _1909: x0 => x0.stopContinuousDecode,
      _1911: x0 => x0.stream,
      _1912: x0 => x0.videoElement,
      _1913: () => globalThis.BarcodeDetector.getSupportedFormats(),
      _1914: x0 => x0.rawValue,
      _1915: x0 => x0.format,
      _1916: x0 => x0.cornerPoints,
      _1917: x0 => x0.x,
      _1918: x0 => x0.y,
      _1932: x0 => x0.mediaDevices,
      _1934: x0 => x0.facingMode,
      _1935: x0 => x0.deviceId,
      _1936: (x0,x1) => ({width: x0,height: x1}),
      _1937: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      _1938: o => o instanceof Array,
      _1942: a => a.pop(),
      _1943: (a, i) => a.splice(i, 1),
      _1944: (a, s) => a.join(s),
      _1945: (a, s, e) => a.slice(s, e),
      _1947: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1948: a => a.length,
      _1950: (a, i) => a[i],
      _1951: (a, i, v) => a[i] = v,
      _1953: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _1954: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1956: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _1957: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1958: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _1959: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1960: o => o instanceof Uint8ClampedArray,
      _1961: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1962: o => o instanceof Uint16Array,
      _1963: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1964: o => o instanceof Int16Array,
      _1965: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1966: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _1967: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1968: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _1969: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1971: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1972: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _1973: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1974: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _1975: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1976: (a, i) => a.push(i),
      _1977: (t, s) => t.set(s),
      _1978: l => new DataView(new ArrayBuffer(l)),
      _1979: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1980: o => o.byteLength,
      _1981: o => o.buffer,
      _1982: o => o.byteOffset,
      _1983: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1984: (b, o) => new DataView(b, o),
      _1985: (b, o, l) => new DataView(b, o, l),
      _1986: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1987: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1988: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1989: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1990: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1991: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1992: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1993: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1994: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1995: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1996: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1997: Function.prototype.call.bind(DataView.prototype.setInt32),
      _2000: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _2001: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _2002: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _2003: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _2004: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _2005: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _2006: Function.prototype.call.bind(Number.prototype.toString),
      _2007: Function.prototype.call.bind(BigInt.prototype.toString),
      _2008: Function.prototype.call.bind(Number.prototype.toString),
      _2009: (d, digits) => d.toFixed(digits),
      _2019: () => globalThis.window.isSecureContext,
      _2020: () => globalThis.crypto.subtle,
      _2021: (x0,x1,x2) => globalThis.crypto.subtle.decrypt(x0,x1,x2),
      _2025: (x0,x1,x2) => globalThis.crypto.subtle.encrypt(x0,x1,x2),
      _2028: (x0,x1,x2,x3,x4) => globalThis.crypto.subtle.importKey(x0,x1,x2,x3,x4),
      _2057: x0 => x0.x,
      _2058: x0 => x0.y,
      _2107: (x0,x1) => { x0.responseType = x1 },
      _2108: x0 => x0.response,
      _2144: x0 => x0.length,
      _2154: (x0,x1) => { x0.lang = x1 },
      _2183: x0 => x0.style,
      _2196: (x0,x1) => { x0.oncancel = x1 },
      _2202: (x0,x1) => { x0.onchange = x1 },
      _2242: (x0,x1) => { x0.onerror = x1 },
      _2258: (x0,x1) => { x0.onload = x1 },
      _2282: (x0,x1) => { x0.onpause = x1 },
      _2284: (x0,x1) => { x0.onplay = x1 },
      _2540: (x0,x1) => { x0.target = x1 },
      _2542: (x0,x1) => { x0.download = x1 },
      _2567: (x0,x1) => { x0.href = x1 },
      _2755: x0 => x0.videoWidth,
      _2756: x0 => x0.videoHeight,
      _2789: (x0,x1) => { x0.srcObject = x1 },
      _2802: x0 => x0.paused,
      _2817: (x0,x1) => { x0.controls = x1 },
      _3108: (x0,x1) => { x0.accept = x1 },
      _3122: x0 => x0.files,
      _3148: (x0,x1) => { x0.multiple = x1 },
      _3166: (x0,x1) => { x0.type = x1 },
      _3416: (x0,x1) => { x0.src = x1 },
      _3418: (x0,x1) => { x0.type = x1 },
      _3422: (x0,x1) => { x0.async = x1 },
      _3424: (x0,x1) => { x0.defer = x1 },
      _3426: (x0,x1) => { x0.crossOrigin = x1 },
      _3436: (x0,x1) => { x0.charset = x1 },
      _3460: x0 => x0.width,
      _3461: (x0,x1) => { x0.width = x1 },
      _3462: x0 => x0.height,
      _3463: (x0,x1) => { x0.height = x1 },
      _3883: () => globalThis.window,
      _3921: x0 => x0.document,
      _3943: x0 => x0.navigator,
      _4200: x0 => x0.indexedDB,
      _4207: x0 => x0.localStorage,
      _4266: x0 => x0.message,
      _4309: x0 => x0.clipboard,
      _4314: x0 => x0.mediaDevices,
      _4330: x0 => x0.userAgent,
      _4331: x0 => x0.vendor,
      _4380: x0 => x0.data,
      _4765: (x0,x1) => { x0.binaryType = x1 },
      _4815: x0 => x0.localDescription,
      _4821: x0 => x0.signalingState,
      _4822: x0 => x0.iceGatheringState,
      _4823: x0 => x0.iceConnectionState,
      _4824: x0 => x0.connectionState,
      _4837: (x0,x1) => { x0.onicegatheringstatechange = x1 },
      _4849: x0 => x0.type,
      _4850: x0 => x0.sdp,
      _4851: x0 => x0.type,
      _4853: x0 => x0.sdp,
      _4885: x0 => x0.candidate,
      _5085: (x0,x1) => { x0.onopen = x1 },
      _5087: (x0,x1) => { x0.onbufferedamountlow = x1 },
      _5093: (x0,x1) => { x0.onclose = x1 },
      _5095: (x0,x1) => { x0.onmessage = x1 },
      _5102: (x0,x1) => { x0.maxPacketLifeTime = x1 },
      _5104: (x0,x1) => { x0.maxRetransmits = x1 },
      _5114: x0 => x0.channel,
      _6412: x0 => x0.type,
      _6413: x0 => x0.target,
      _6524: () => globalThis.document,
      _6583: x0 => x0.documentElement,
      _6604: x0 => x0.body,
      _6606: x0 => x0.head,
      _6646: x0 => x0.fullscreenElement,
      _6933: x0 => x0.id,
      _6934: (x0,x1) => { x0.id = x1 },
      _6958: (x0,x1) => { x0.innerHTML = x1 },
      _8461: x0 => x0.size,
      _8462: x0 => x0.type,
      _8468: x0 => x0.name,
      _8469: x0 => x0.lastModified,
      _8474: x0 => x0.length,
      _8480: x0 => x0.result,
      _9764: x0 => x0.id,
      _9794: x0 => x0.facingMode,
      _9891: x0 => x0.whiteBalanceMode,
      _9893: x0 => x0.exposureMode,
      _9895: x0 => x0.focusMode,
      _9964: (x0,x1) => { x0.whiteBalanceMode = x1 },
      _9966: (x0,x1) => { x0.exposureMode = x1 },
      _9968: (x0,x1) => { x0.focusMode = x1 },
      _10008: x0 => x0.width,
      _10010: x0 => x0.height,
      _10016: x0 => x0.facingMode,
      _10092: x0 => x0.deviceId,
      _10093: x0 => x0.kind,
      _10420: x0 => x0.result,
      _10421: x0 => x0.error,
      _10426: (x0,x1) => { x0.onsuccess = x1 },
      _10428: (x0,x1) => { x0.onerror = x1 },
      _10448: x0 => x0.name,
      _10450: x0 => x0.objectStoreNames,
      _10466: x0 => x0.name,
      _10468: x0 => x0.keyPath,
      _10471: x0 => x0.autoIncrement,
      _10500: x0 => x0.error,
      _10502: (x0,x1) => { x0.onabort = x1 },
      _10504: (x0,x1) => { x0.oncomplete = x1 },
      _10506: (x0,x1) => { x0.onerror = x1 },
      _11332: (x0,x1) => { x0.display = x1 },
      _11496: (x0,x1) => { x0.height = x1 },
      _11690: (x0,x1) => { x0.objectFit = x1 },
      _11820: (x0,x1) => { x0.pointerEvents = x1 },
      _12118: (x0,x1) => { x0.transform = x1 },
      _12122: (x0,x1) => { x0.transformOrigin = x1 },
      _12186: (x0,x1) => { x0.width = x1 },
      _12554: x0 => x0.name,
      _12555: x0 => x0.message,
      _13299: () => globalThis.console,
      _13338: (x0,x1) => x0.error(x1),
      _13351: x0 => x0.message,
      _13353: x0 => globalThis.Wakelock.toggle(x0),

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });
    dartInstance.exports.$setThisModule(dartInstance);

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}

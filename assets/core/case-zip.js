/* ZIP input for the existing case-folder contract. All extraction stays local. */
(function (global) {
  'use strict';
  var MAX_TOTAL = 6 * 1024 * 1024;
  var MAX_ARCHIVE = 8 * 1024 * 1024;
  var MAX_ENTRIES = 1024;
  var CRC = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    CRC[n] = c >>> 0;
  }
  function crc32(bytes) {
    var value = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) value = CRC[(value ^ bytes[i]) & 255] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }
  function decode(bytes) {
    try { return global.fflate.strFromU8(bytes); }
    catch (e) { throw new Error('ZIP文件名编码无法识别，请重新压缩为UTF-8格式的普通ZIP。'); }
  }
  function normalize(name) {
    name = name.replace(/\\/g, '/');
    if (name.length > 1024 || /^(\/|[a-z]:)/i.test(name) || /[\x00-\x1f]/.test(name)) {
      throw new Error('ZIP包含无效的文件路径，请重新压缩案例文件夹。');
    }
    var parts = name.split('/');
    if (parts.indexOf('..') >= 0) throw new Error('ZIP包含越级路径，不能作为案例包读取。');
    return parts.filter(function (p) { return p && p !== '.'; }).join('/');
  }
  function ignored(name) {
    return name.split('/').some(function (p) {
      return p === '__MACOSX' || p === '.DS_Store' || p === 'Thumbs.db' || p.slice(0, 2) === '._';
    });
  }
  function unpack(bytes) {
    if (!global.fflate || !global.fflate.inflateSync) throw new Error('ZIP读取组件未加载，请刷新页面后重试。');
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > MAX_ARCHIVE) throw new Error('ZIP文件超过8 MB；案例解压后的全部文件需控制在6 MB以内。');
    if (bytes.length < 22) throw new Error('ZIP文件不完整或格式错误，请重新压缩后上传。');
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var end = -1, i;
    for (i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    }
    if (end < 0) throw new Error('ZIP文件不完整或格式错误，请重新压缩后上传。');
    var count = view.getUint16(end + 10, true);
    var directorySize = view.getUint32(end + 12, true), directory = view.getUint32(end + 16, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count) {
      throw new Error('不支持分卷ZIP，请将一个案例压缩成一个普通ZIP文件。');
    }
    if (count === 65535 || directorySize === 0xffffffff || directory === 0xffffffff) throw new Error('不支持ZIP64，请使用普通ZIP；案例解压后上限6 MB。');
    if (!count) throw new Error('ZIP里没有案例文件。');
    if (count > MAX_ENTRIES) throw new Error('ZIP文件数量超过1024项，请只压缩当前案例需要的文件。');
    if (directory + directorySize > end) throw new Error('ZIP目录损坏，请重新压缩后上传。');
    var entries = [], names = Object.create(null), total = 0, pos = directory;
    // Inspect all declared sizes before allocating any expanded data.
    for (i = 0; i < count; i++) {
      if (pos + 46 > directory + directorySize || view.getUint32(pos, true) !== 0x02014b50) throw new Error('ZIP目录不完整，请重新压缩后上传。');
      var flags = view.getUint16(pos + 8, true), method = view.getUint16(pos + 10, true);
      var checksum = view.getUint32(pos + 16, true), compressed = view.getUint32(pos + 20, true), size = view.getUint32(pos + 24, true);
      var nameLength = view.getUint16(pos + 28, true), extra = view.getUint16(pos + 30, true), comment = view.getUint16(pos + 32, true);
      var local = view.getUint32(pos + 42, true), next = pos + 46 + nameLength + extra + comment;
      if (next > directory + directorySize) throw new Error('ZIP文件名或目录损坏。');
      var rawName = decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
      var name = normalize(rawName), mode = view.getUint32(pos + 38, true) >>> 16;
      pos = next;
      if (!name || /[\\/]$/.test(rawName) || ignored(name)) continue;
      if (flags & 0x41) throw new Error('不能读取加密ZIP，请去掉密码后重新上传。');
      if ((mode & 0xf000) === 0xa000) throw new Error('ZIP包含符号链接，请将实际文件放入案例包。');
      if (method !== 0 && method !== 8) throw new Error('这种ZIP压缩方式暂不支持，请使用普通ZIP压缩。');
      if (size === 0xffffffff || compressed === 0xffffffff || local === 0xffffffff) throw new Error('不支持ZIP64，请使用普通ZIP。');
      total += size;
      if (total > MAX_TOTAL) throw new Error('ZIP解压后超过6 MB，请压缩图片或精简素材后重新上传。');
      if (names[name]) throw new Error('ZIP内存在重名路径：' + name + '，请整理后重新压缩。');
      names[name] = true;
      if (local + 30 > directory || view.getUint32(local, true) !== 0x04034b50) throw new Error('ZIP文件内容损坏：' + name);
      if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) throw new Error('ZIP文件头不一致：' + name);
      var localNameLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
      var start = local + 30 + localNameLength + localExtra;
      if (start + compressed > directory || decode(bytes.subarray(local + 30, local + 30 + localNameLength)) !== rawName) throw new Error('ZIP文件内容不完整：' + name);
      entries.push({ name: name, size: size, compressed: compressed, method: method, checksum: checksum, start: start });
    }
    if (pos !== directory + directorySize) throw new Error('ZIP目录大小不一致，请重新压缩后上传。');
    var manifests = entries.filter(function (e) { return /(^|\/)case\.json$/i.test(e.name); });
    if (!manifests.length) manifests = entries.filter(function (e) { return /(^|\/)[a-z0-9._-]+\.case\.json$/i.test(e.name); });
    if (!manifests.length) throw new Error('ZIP里没有找到case.json清单，请上传完整的案例压缩包。');
    if (manifests.length > 1) throw new Error('ZIP内有多个案例清单，请一次上传一个案例ZIP。');
    var prefix = manifests[0].name.slice(0, manifests[0].name.lastIndexOf('/') + 1);
    return entries.filter(function (entry) { return entry.name.indexOf(prefix) === 0; }).map(function (entry) {
      var compressedData = bytes.subarray(entry.start, entry.start + entry.compressed), data;
      try {
        // One spare byte detects streams whose real size exceeds the ZIP header,
        // while bounding output allocation even for misleading compressed data.
        data = entry.method === 0 ? compressedData : global.fflate.inflateSync(compressedData, { out: new Uint8Array(entry.size + 1) });
      } catch (e) { throw new Error('ZIP解压失败：' + entry.name + '，请重新压缩后上传。'); }
      if (data.length !== entry.size || crc32(data) !== entry.checksum) throw new Error('ZIP文件校验失败：' + entry.name + '，请重新压缩后上传。');
      return { name: entry.name.slice(prefix.length), data: data };
    });
  }
  function read(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > MAX_ARCHIVE) { reject(new Error('ZIP文件超过8 MB；案例解压后的全部文件需控制在6 MB以内。')); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(unpack(new Uint8Array(reader.result)).map(function (entry) {
            var result = new File([entry.data], entry.name.split('/').pop());
            Object.defineProperty(result, 'webkitRelativePath', { value: entry.name, configurable: true });
            return result;
          }));
        } catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(new Error('ZIP文件读取失败，请重新选择。')); };
      reader.onabort = function () { reject(new Error('ZIP读取已取消。')); };
      reader.readAsArrayBuffer(file);
    });
  }
  global.CaseZip = { read: read, unpack: unpack };
})(window);

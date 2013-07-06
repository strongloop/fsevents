/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

var util = require('util');
var events = require('events');
var binding;
try {
  binding = require('./build/Release/fswatch');
} catch(ex) {
  binding = require('./build/Debug/fswatch');
}

var Fs = require('fs');

module.exports = function(path) {
  var fsevents = new FSEvents(path);
  fsevents.on('fsevent', function(path, flags, id) {
    var info = {
      event:'unknown',
      id:id,
      path: path,
      type: fileType(flags),
      changes: fileChanges(flags),
    };
    if (FSEvents.kFSEventStreamEventFlagItemCreated & flags) {
      info.event = 'created';
    } else if (FSEvents.kFSEventStreamEventFlagItemRemoved & flags) {
      info.event = 'deleted';
    } else if (FSEvents.kFSEventStreamEventFlagItemRenamed & flags) {
      info.event = 'moved';
    } else if (FSEvents.kFSEventStreamEventFlagItemModified & flags) {
      info.event = 'modified';
    }

    if (info.event == 'moved') {
      Fs.stat(info.event, function(err, stat) {
      if (err || !stat) {
        info.event = 'moved-out';
      } else {
        info.event = 'moved-in';
      }
      fsevents.emit('change', path, info);
      fsevents.emit(info.event, path, info);
    });
    } else {
      fsevents.emit('change', path, info);
      if (info.event !== 'unknown') fsevents.emit(info.event, path, info);
    }
  });
  return fsevents;
};
var FSEvents = binding.FSEvents;
util.inherits(FSEvents, events.EventEmitter);

function fileType(flags) {
  if (FSEvents.kFSEventStreamEventFlagItemIsFile & flags) return 'file';
  if (FSEvents.kFSEventStreamEventFlagItemIsDir & flags) return 'directory';
  if (FSEvents.kFSEventStreamEventFlagItemIsSymlink & flags) return 'symlink';
}

function fileChanges(flags) {
  var res = {};
  res.inode = !!(FSEvents.kFSEventStreamEventFlagItemInodeMetaMod & flags);
  res.finder = !!(FSEvents.kFSEventStreamEventFlagItemFinderInfoMod & flags);
  res.access = !!(FSEvents.kFSEventStreamEventFlagItemChangeOwner & flags);
  res.xattrs = !!(FSEvents.kFSEventStreamEventFlagItemXattrMod & flags);
  return res;
}

$.fn.repeaterVal = function () {
    var parse = function (raw) {
        var parsed = [];

        foreach(raw, function (val, key) {
            var parsedKey = [];
            if(key !== "undefined") {
                parsedKey.push(key.match(/^[^\[]*/)[0]);
                parsedKey = parsedKey.concat(map(
                    key.match(/\[[^\]]*\]/g),
                    function (bracketed) {
                        return bracketed.replace(/[\[\]]/g, '');
                    }
                ));

                parsed.push({
                    val: val,
                    key: parsedKey
                });
            }
        });

        return parsed;
    };

    var build = function (parsed) {
        if(
            parsed.length === 1 &&
            (parsed[0].key.length === 0 || parsed[0].key.length === 1 && !parsed[0].key[0])
        ) {
            return parsed[0].val;
        }

        foreach(parsed, function (p) {
            p.head = p.key.shift();
        });

        var grouped = (function () {
            var grouped = {};

            foreach(parsed, function (p) {
                if(!grouped[p.head]) {
                    grouped[p.head] = [];
                }
                grouped[p.head].push(p);
            });

            return grouped;
        }());

        var built;

        if(/^[0-9]+$/.test(parsed[0].head)) {
            built = [];
            foreach(grouped, function (group) {
                built.push(build(group));
            });
        }
        else {
            built = {};
            foreach(grouped, function (group, key) {
                built[key] = build(group);
            });
        }

        return built;
    };

    return build(parse($(this).inputVal()));
};

$.fn.repeater = function (fig) {
    fig = fig || {};

    var setList;

    $(this).each(function () {

        var $self = $(this);

        var show = fig.show || function () {
            $(this).show();
        };

        var hide = fig.hide || function (removeElement) {
            removeElement();
        };

        var $list = $self.find('[data-repeater-list]').first();
        var $items = function() {
            return $list.find('[data-repeater-item]');
        };

        var $itemTemplate = $list.find('[data-repeater-item]')
            .first().clone().hide();

        var getGroupName = function () {
            var groupName = $list.data('repeater-list');
            return fig.$parent ?
                fig.$parent.data('item-name') + '[' + groupName + ']' :
                groupName;
        };

        var setIndexes = function ($items, groupName) {
            $items().each(function (index) {
                var $item = $(this);
                $item.data('item-name', groupName + '[' + index + ']');
                $item.find('[name]')
                    .each(function () {
                        var $input = $(this);
                        // match non empty brackets (ex: "[foo]")
                        var matches = $input.attr('name').match(/\[[^\]]+\]/g);

                        var name = matches ?
                            // strip "[" and "]" characters
                            last(matches).replace(/\[|\]/g, '') :
                            $input.attr('name');


                        var newName = groupName + '[' + index + '][' + name + ']' +
                            ($input.is(':checkbox') || $input.attr('multiple') ? '[]' : '');

                        $input.attr('name', newName);
                    });
            });

            $list.find('input[name][checked]')
                .removeAttr('checked')
                .prop('checked', true);
        };

        setIndexes($items, getGroupName());
        if (fig.initEmpty) {
            $items().remove();
        }

        if (fig.ready) {
            fig.ready(function () {
                setIndexes($items, getGroupName());
            });
        }

        var updateButtons = function () {
            $items().each(function () {
                var createButton = false,
                    deleteButton = false;

                if ($(this).index() + 1 === $items().length) {
                    createButton = true;
                } else {
                    deleteButton = true;
                }

                $(this).find('[data-repeater-delete]').toggle(deleteButton);
                $(this).find('[data-repeater-create]').toggle(createButton);
            });
        };

        var appendItem = (function () {
            var setItemsValues = function ($item, data) {
                if (data || fig.defaultValues) {
                    var inputNames = {};
                    $item.find('[name]').each(function () {
                        var key = $(this).attr('name').match(/\[([^\]]*)(\]|\]\[\])$/)[1];
                        inputNames[key] = $(this).attr('name');
                    });

                    $item.inputVal(map(
                        filter(data || fig.defaultValues, function (val, name) {
                            return inputNames[name];
                        }),
                        identity,
                        function (name) {
                            return inputNames[name];
                        }
                    ));
                }
            };

            return function ($item, data) {
                $list.append($item);
                setIndexes($items, getGroupName());
                $item.find('[name]').each(function () {
                    $(this).inputClear();
                });
                setItemsValues($item, data || fig.defaultValues);
                updateButtons();
            };
        }());

        var addItem = function (data) {
            var $item = $itemTemplate.clone();
            appendItem($item, data);
            show.call($item.get(0));
        };

        setList = function (rows) {
            $items().remove();
            foreach(rows, addItem);
        };

        $list.on('click', '[data-repeater-create]', function () {
            addItem();
        });

        $list.on('click', '[data-repeater-delete]', function () {
            var self = $(this).closest('[data-repeater-item]').get(0);
            hide.call(self, function () {
                $(self).remove();
                setIndexes($items, getGroupName());
            });
        });

        updateButtons();

    });

    this.setList = setList;

    return this;
};

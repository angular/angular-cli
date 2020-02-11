# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.https://github.com/angular/angular-cli/commit/ba8852b912c4a13029b75a2d6232ea654bc1c773#commitcomment-3722581



METACABAN

 return function (i, n) {
                e.call(this, i, n), t(this.element).trigger({
                    type: i,
                    gesture: n
                })
            }
        }(e.Manager.prototype.emit)
    }),
    function (t) {
        t.fn.extend({
            openModal: function (e) {
                debugger;
                var i = this,
                    n = t('<div id="lean-overlay"></div>');
                t("body").append(n);
                var o = {
                    modalDev: "",
                    opacity: .5,
                    in_duration: 300,
                    out_duration: 200,
                    ready: void 0,
                    complete: void 0,
                    dismissible: !0
                };
                e = t.extend(o, e), e.dismissible && (t("#lean-overlay").click(function () {
                    t(i).closeModal(e)
                }), t(document).keyup(function (n) {
                    27 === n.keyCode && (t(i).closeModal(e), t(this).off())
                })), t(i).find(".modal-close").click(function (n) {
                    n.preventDefault(), t(i).closeModal(e)
                }), t("#lean-overlay").css({
                    display: "block",
                    opacity: 0
                }), t(i).css({
                    display: "block",
                    top: "4%",
                    opacity: 0
                }), t("#lean-overlay").velocity({
                    opacity: e.opacity
                }, {
                        duration: e.in_duration,
                        queue: !1,
                        ease: "easeOutCubic"
                    }), t(i).velocity({
                        top: "10%",
                        opacity: 1
                    }, {
                            duration: e.in_duration,
                            queue: !1,
                            ease: "easeOutCubic",
                            complete: function () {
                                "function" == typeof e.ready && e.ready()
                            }
                        })
            }
        }), t.fn.extend({
            closeModal: function (e) {

                var i = {
                    out_duration: 200,
                    complete: void 0
                },
                    e = t.extend(i, e);
                t("#lean-overlay").velocity({
                    opacity: 0
                }, {
                        duration: e.out_duration,
                        queue: !1,
                        ease: "easeOutQuart"
                    }), t(this).fadeOut(e.out_duration, function () {
                        t(this).css({
                            top: 0
                        }), t("#lean-overlay").css({
                            display: "none"
                        }), "function" == typeof e.complete && e.complete(), t("#lean-overlay").remove()
                    })
            }
        }), t.fn.extend({
            leanModal: function (e) {
                //alert(e.modalDev);

                return this.each(function () {
                    var nn = e.modalDev;
                    //alert(nn);
                    if (nn != null) {
                        t(nn).openModal(e),
                            e.preventDefault = function () {
                                e.srcEvent.preventDefault()
                            };
                    }
                    t(this).click(function (i) {
                        if (e.modalDev != null) {
                            var n = e.modalDev;
                            t(n).openModal(e), e.preventDefault = function () {
                                e.srcEvent.preventDefault()
                            };
                        }
                        else {
                            var n = t(this).attr("href"); t(n).openModal(e),
                                t(n).openModal(e), e.preventDefault = function () {
                                    e.srcEvent.preventDefault()
                                };
                        }



                    })
                })


            }
        })
    }(jQuery),
    function (t) {

// ==UserScript==
// @name           HackerNewsCollapseComments
// @description    Add collapse/expand button on Hacker News comment threads.
// @include        https://news.ycombinator.com/*
// @version        1.0.16
// ==/UserScript==

Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
    var value;

    value = this.getItem(key);

    return value && JSON.parse(value);
};

(function(window, document) {
    function onReady(completed) {
        if (document.readyState === "complete") {
            setTimeout(completed);
        } else {
            document.addEventListener("DOMContentLoaded", completed, false);
        }
    }

    function toggle(collapseCommentLink) {
        var comment;

        comment = collapseCommentLink.closest(".athing");

        if (comment.classList.contains("collapsed-comment")) {
            collapseCommentLink.innerText = "[-]";

            expand(comment);
        } else {
            collapseCommentLink.innerText = "[+]";

            collapse(comment);
        }
    }

    function getReplies(comment) {
        var commentIndentLevel, replies, nextComment, nextCommentIndentLevel;

        commentIndentLevel = comment.querySelector(".ind img").width;

        replies = [];

        nextComment = comment.nextElementSibling;

        while (nextComment) {
            nextCommentIndentLevel = nextComment.querySelector(".ind img").width;

            if (nextCommentIndentLevel > commentIndentLevel) {
                replies.push(nextComment);

                nextComment = nextComment.nextElementSibling;
            } else {
                nextComment = null;
            }
        }

        return replies;
    }

    function addCommentIdToLocalStorage(commentId) {
        var theads, threadId, threadIds, sortedThreads;

        threads = window.localStorage.getObject("threads") || {};

        threadId = window.location.search.split("?id=")[1];

        threads[threadId] = threads[threadId] || {};

        threads[threadId].comments = threads[threadId].comments || [];

        if (threads[threadId].comments.indexOf(commentId) === -1) {
            threads[threadId].comments.push(commentId);
        }

        if (threads[threadId].comments.length > 128) {
            threads[threadId].comments.shift();
        }

        threads[threadId].id = threadId;

        threads[threadId].updatedAt = new Date();

        threadIds = Object.keys(threads);

        if (threadIds.length > 64) {
            sortedThreads = threadIds.map(function(id) { return threads[id]; }).sort(function(a, b) { return new Date(a.updatedAt) - new Date(b.updatedAt); });

            sortedThreads.splice(0, 1);

            threads = sortedThreads.reduce(function(accumulator, thread) {
                accumulator[thread.id] = thread;

                return accumulator;
            }, {});
        }

        window.localStorage.setObject("threads", threads);
    }

    function removeCommentIdFromLocalStorage(commentId) {
        var threads, threadId, commentIndex;

        threads = window.localStorage.getObject("threads") || {};

        threadId = window.location.search.split("?id=")[1];

        threads[threadId] = threads[threadId] || {};

        threads[threadId].comments = threads[threadId].comments || [];

        commentIndex = threads[threadId].comments.indexOf(commentId);

        if (commentIndex > -1) {
            threads[threadId].comments = threads[threadId].comments.filter(function(comment) { return comment !== commentId; });

            if (threads[threadId].comments.length === 0) {
                delete threads[threadId];
            }
        }

        window.localStorage.setObject("threads", threads);
    }

    function collapse(comment, addToStorage = true) {
        var commentId, threads, threadId;

        comment.classList.add("collapsed-comment");

        commentId = comment.querySelector(".default .comhead .age a").href.split("?id=")[1];

        getReplies(comment).forEach(function(reply) {
            reply.classList.add("collapsed-reply");

            if (!reply.dataset.collapsingCommentId) {
                reply.dataset.collapsingCommentId = commentId;
            }
        });

        if (addToStorage) {
            addCommentIdToLocalStorage(commentId);
        }
    }

    function expand(comment, removeFromStorage = true) {
        comment.classList.remove("collapsed-comment");

        commentId = comment.querySelector(".default .comhead .age a").href.split("?id=")[1];

        getReplies(comment).forEach(function(reply) {
            if (reply.dataset.collapsingCommentId && reply.dataset.collapsingCommentId === commentId) {
                reply.classList.remove("collapsed-reply");

                delete reply.dataset.collapsingCommentId;
            }
        });

        if (removeFromStorage) {
            removeCommentIdFromLocalStorage(commentId);
        }
    }

    function collapseStoredComments() {
        var threadId, threads, comments, sortedComments;

        threadId = window.location.search.split("?id=")[1];

        threads = window.localStorage.getObject("threads") || {};

        if (threads[threadId]) {
            comments = threads[threadId].comments.map(function(commentId) {
                var link;

                link = document.querySelector("a[href='item?id=" + commentId + "']");

                if (link) {
                    return link.closest(".athing");
                } else {
                    return null;
                }
            });


            sortedComments = comments.filter(function(comment) { return comment; }).sort(function(a, b) {
                return b.querySelector(".ind img").width - a.querySelector(".ind img").width;
            });

            sortedComments.forEach(function(comment) {
                comment.querySelector(".collapse-comment a").innerText = "[+]";

                collapse(comment, false);
            });
        }
    }

    onReady(function() {
        var head, style, commentHeaderSelector, commentHeaders;

        style = document.createElement("style");

        style.innerText = ".collapsed-comment .default br, .collapsed-comment .default .comment, .collapsed-reply { display: none; } .collapsed-comment .default > div { margin-top: -7px !important; }";

        head = document.querySelector("head");

        head.appendChild(style);

        commentHeaderSelector = "#hnmain .comment-tree .athing .default .comhead";

        commentHeaders = document.querySelectorAll(commentHeaderSelector);

        if (commentHeaders.length > 0) {
            Array.prototype.forEach.call(commentHeaders, function(commentHeader) {
                var collapseCommentLink, collapseCommentSpan;

                collapseCommentLink = document.createElement("a");

                collapseCommentLink.href = "javascript:void(0);";

                collapseCommentLink.innerText = "[-]";

                collapseCommentLink.onclick = function(event) {
                    toggle(collapseCommentLink);
                };

                collapseCommentSpan = document.createElement("span");

                collapseCommentSpan.classList.add("collapse-comment");

                collapseCommentSpan.appendChild(collapseCommentLink);

                commentHeader.appendChild(collapseCommentSpan);
            });

            collapseStoredComments();
        }
    });
})(window, window.document);

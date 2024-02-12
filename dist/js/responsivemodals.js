/*! ResponsiveModals.js²
 *
 * @author Fork Copyright (c) 2023 @peter-power-594
 * @author Original Copyright (c) 2011-2023 @kylefox
 * @license Available under the MIT license
 */
(function( _win, _doc ) {


	var jModalInst = {};


	// Stock Modal Layers
	jModalInst.modals = [];


	// Get latest active modal
	jModalInst.getCurrent = function() {
		return jModalInst.modals.length ? jModalInst.modals[ jModalInst.modals.length - 1 ] : null;
	};


	// Select active modal
	jModalInst.selectCurrent = function() {
		var i, first = true, myBlocker;
		for ( i = jModalInst.modals.length - 1; i >= 0; i-- ) {
			myBlocker = jModalInst.modals[ i ].$blocker || false;
			if ( myBlocker ) {
				if ( ! first && /current/.test( myBlocker.className || '' ) ) {
					myBlocker.className = myBlocker.className.replace( /\scurrent/, '' );
				}
				else if ( ! /current/.test( myBlocker.className || '' ) ) {
					myBlocker.className += ' current';
				}
				if ( first ) {
					if ( /behind/.test( myBlocker.className || '' ) ) {
						myBlocker.className = myBlocker.className.replace( /\sbehind/, '' );
					}
				}
				else if ( ! /behind/.test( myBlocker.className || '' ) ) {
					myBlocker.className += ' behind';
				}
				first = false;
			}
		}
	};


	// Returns if there currently is an active modal
	jModalInst.isActive = function () {
		return jModalInst.modals.length > 0;
	};


	jModalInst.close = function( event ) {
		if ( ! jModalInst.isActive() ) {
			return;
		}
		if ( event ) {
			event.preventDefault();
		}
		var current = jModalInst.getCurrent();
		current.closeModal();
		return current.$elm;
	};


	jModalInst.events = {
		BEFORE_BLOCK:   'modal:before-block',
		BLOCK:          'modal:block',
		BEFORE_OPEN:    'modal:before-open',
		OPEN:           'modal:open',
		BEFORE_CLOSE:   'modal:before-close',
		CLOSE:          'modal:close',
		AFTER_CLOSE:    'modal:after-close',
		AJAX_SEND:      'modal:ajax:send',
		AJAX_SUCCESS:   'modal:ajax:success',
		AJAX_FAIL:      'modal:ajax:fail',
		AJAX_COMPLETE:  'modal:ajax:complete'
	};


	jModalInst.defaultOptions = {
		closeExisting: true,
		escapeClose: true,
		clickClose: true,
		closeText: 'Close',
		modalClass: "rmodal",
		blockerClass: "rmodal-wrapper",
		spinnerHtml: '<div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div>',
		showSpinner: true,
		showClose: true,
		fadeDuration: 450,	 // Number of milliseconds the fade animation takes.
		fadeDelay: 0.5		// Point during the overlay's fade-in that the modal begins to fade in (.5 = 50%, 1.5 = 150%, etc.)
	};


	jModalInst.keydownHander = function( event ) {
		var current = jModalInst.getCurrent();
		if ( event.which === 27 && current.options && current.options.escapeClose ) {
			current.closeModal();
		}
	};


	jModalInst.init = function( event ) {
		if ( ! event || ! event.target ) {
			return true;
		}
		var targetNode = event.target,
			relLink = targetNode && targetNode.nodeType && 1 === targetNode.nodeType ? targetNode.getAttribute( 'rel' ) : false;
		if ( ! relLink || ! /modal:/.test( relLink ) ) {
			while ( targetNode.parentNode && ! targetNode.getAttribute( 'rel' ) ) {
				targetNode = targetNode.parentNode;
			}
			if ( 'html' === ( targetNode.tagName || 'html' ) ) {
				return true;
			}
			relLink = targetNode.getAttribute( 'rel' ) || false;
		}
		if ( ! relLink || ! /modal:/.test( relLink ) ) {
			return true;
		}
        if ( typeof event.preventDefault === 'function' ) {
            event.preventDefault();
        }
        if ( typeof event.stopPropagation === 'function' ) {
            event.stopPropagation();
        }
		if ( relLink === 'modal:close' ) {
			jModalInst.close();
			return false;
		}
		else if ( relLink === 'modal:open' ) {
			event.preventDefault();
			new jModal( targetNode );
            return false;
		}
	};


	function jModal( el, options ) {
		var _self;
		for ( var i = 0, inst = jModalInst.modals; i < inst.length; i++ ) {
			if ( inst[ i ] && inst[ i ].anchor && inst[ i ].anchor === el ) {
				_self = inst[ i ];
				break;
			}
		}
		if ( ! _self ) {
			_self = this;
			_self.$body = _doc.body;
			// Generate Options
			_self.options = {};
			options = options || {};
			defaultOptions = jModalInst.defaultOptions;
			for ( var k in defaultOptions ) {
				_self.options[ k ] = typeof options[ k ] !== 'undefined' ? options[ k ] : defaultOptions[ k ];
			}
			_self.options.doFade = ! isNaN( parseInt( _self.options.fadeDuration, 10 ) );
			_self.$blocker = null;
			// Clsoe Existing
			if ( _self.options.closeExisting ) {
				while ( jModalInst.isActive() ) {
					jModalInst.close(); // Close any open modals.
				}
			}
			jModalInst.modals.push( _self );
		}
		var targetElm;
		if ( el && el.tagName && 'A' === el.tagName.toUpperCase() ) {
			targetElm = el.getAttribute( 'href');
			_self.anchor = el;
			if ( /^#/.test( targetElm ) ) { // Select element by id from href
				_self.$elm = _doc.getElementById( targetElm.replace( /#/, '' ).replace( /\?.*/, '' ) ) || false;
				if ( ! _self.$elm ) {
					return false;
				}
				// Move the target node at the root of html body to avoid z-index issue
				_self.$body.appendChild( _self.$elm );
				_self.openModal();
			}
			else { // Ajax
				_self.$elm = _doc.createElement( 'div' );
				_self.$elm.style.display = 'none';
				_self.$body.appendChild( _self.$elm );
				var removeModal = function( event ) {
					if ( event && typeof event.preventDefault === 'function' ) {
						event.preventDefault();
					}
					if ( ! event.detail || ! event.detail.elm ) {
						return false;
					}
					var modal = event.detail.elm;
					modal.parentNode.removeChild( modal );
					return true;
				};
				_self.showSpinner();
				el.dispatchEvent( new CustomEvent( jModalInst.events.AJAX_SEND ) );
				var httpRequest = new XMLHttpRequest(),
					startTs = new Date().getTime();
				httpRequest.onreadystatechange = function() {
					if ( httpRequest.readyState === XMLHttpRequest.DONE ) {
						var current;
						if ( httpRequest.status === 200 ) {
							if ( ! jModalInst.isActive()) {
								return;
							}
							var durationTs = new Date().getTime() - startTs;
							setTimeout(function() {
								el.dispatchEvent( new CustomEvent( jModalInst.events.AJAX_SUCCESS ) );
								current = jModalInst.getCurrent();
								if ( current.$elm ) {
									current.$elm.innerHTML = httpRequest.responseText;
									current.$elm.addEventListener( jModalInst.events.CLOSE, removeModal );
								}
								current.hideSpinner();
								current.openModal();
								el.dispatchEvent( new CustomEvent( jModalInst.events.AJAX_COMPLETE ) );								
							}, durationTs > 450 ? 5 : 650 - durationTs );
						} else {
							el.dispatchEvent( new CustomEvent( jModalInst.events.AJAX_FAIL ) );
							current = jModalInst.getCurrent();
							current.hideSpinner();
							jModalInst.modals.pop(); // remove expected modal from the list
							el.dispatchEvent( new CustomEvent( jModalInst.events.AJAX_COMPLETE ) );
						}
					}
				};
				httpRequest.open( "GET", targetElm, true );
				httpRequest.send();
			}
		} else {
			_self.$elm = el;
			_self.anchor = el;
			_self.$body.appendChild( _self.$elm );
			_self.openModal();
		}
	}


	jModal.prototype.openModal = function() {
		var _self = this;
		_self.block();
		_self.anchor.blur();
		if ( _self.options.doFade ) {
			setTimeout(function() {
				_self.showModal();
			}, _self.options.fadeDuration * _self.options.fadeDelay );
		} else {
			_self.showModal();
		}
		_doc.removeEventListener( 'keydown', jModalInst.keydownHander );
		_doc.addEventListener( 'keydown', jModalInst.keydownHander );
		if ( _self.options.clickClose ) {
			_self.$blocker.addEventListener( 'click', function( event ) {
				var clickTarget = ( event || {} ).target || false;
				if ( clickTarget && ( clickTarget === this || clickTarget.parentNode === this ) ) { // 90% of cases ?
					jModalInst.close();
				}
			});
		}
	};


	jModal.prototype.closeModal = function() {
		jModalInst.modals.pop();
		this.unblock();
		this.hideModal();
		if ( ! jModalInst.isActive() ) {
			_doc.removeEventListener( 'keydown', jModalInst.keydownHander );
		}
	};


	jModal.prototype.block = function() {
		var _self = this;
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.BEFORE_BLOCK, _self.getContext() ) );
		_self.$body.style.overflow = 'hidden';
		_self.$blocker = _doc.createElement( 'div' );
		_self.$blocker.className = _self.options.blockerClass + ' blocker current';
		_self.$body.appendChild( _self.$blocker );
		jModalInst.selectCurrent();
		if ( _self.options.doFade ) {
			_self.$blocker.style.opacity = 0;
			_self.$blocker.style.transition = 'opacity ' + _self.options.fadeDuration + 'ms ease-out';
			setTimeout(function() {
				_self.$blocker.style.opacity = 1;
			}, 10);
		}
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.BLOCK, _self.getContext() ) );
	};


	jModal.prototype.unblock = function( now ) {
		var _self = this;
		if ( ! now && _self.options.doFade && _self.$blocker ) {
			_self.$blocker.style.opacity = 1;
			_self.$blocker.style.transition = 'opacity ' + _self.options.fadeDuration + 'ms ease-out';
			setTimeout(function() {
				_self.$blocker.style.opacity = 0;
			}, 10);
			setTimeout(function() {
				for ( var bcn = 0, blockerChildNodes = _self.$blocker.childNodes; bcn < blockerChildNodes.length; bcn++ ) {
					_self.$body.appendChild( blockerChildNodes[ bcn ] );
				}
				_self.$blocker.parentNode.removeChild( _self.$blocker );
				_self.$blocker = null;
				jModalInst.selectCurrent();
				if ( ! jModalInst.isActive() ) {
					try {
						_self.$body.style.removeProperty("overflow");
					}
					catch( e ) {
						_self.$body.style.overflow = 'inherit';
					}
				}
			}, 10 + _self.options.fadeDuration );
		}
	};


	jModal.prototype.showModal = function() {
		var _self = this;
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.BEFORE_OPEN, _self.getContext() ) );
		if ( _self.options.showClose ) {
			_self.closeButton = _doc.createElement( 'a' );
			_self.closeButton.setAttribute( 'href', '#close-modal' );
			_self.closeButton.setAttribute( 'rel', 'modal:close' );
			_self.closeButton.setAttribute( 'class', 'close-' + _self.options.modalClass );
			_self.closeButton.appendChild( _doc.createElement( _self.options.closeText ) );
			_self.$elm.append( _self.closeButton );
		}
		_self.$elm.className = ( _self.$elm.className ? _self.$elm.className + ' ' : '' ) + _self.options.modalClass;
		_self.$blocker.appendChild( _self.$elm );
		if ( _self.options.doFade ) {
			_self.$elm.style.opacity = 0;
			_self.$elm.style.display = 'inline-block';
			_self.$elm.style.transition = 'opacity ' + _self.options.fadeDuration + 'ms ease-out';
			setTimeout(function() {
				_self.$elm.style.opacity = 1;
			}, 10);
		} else {
			_self.$elm.style.display = 'inline-block';
		}
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.OPEN, _self.getContext() ) );
	};


	jModal.prototype.hideModal = function() {
		var _self = this;
		if ( ! _self.$elm ) {
			return false;
		}
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.BEFORE_CLOSE, _self.getContext() ) );
		if ( _self.closeButton ) {
			_self.closeButton.parentNode.removeChild( _self.closeButton );
		}
		if ( _self.options.doFade ) {
			_self.$elm.style.opacity = 1;
			_self.$elm.style.transition = 'opacity ' + _self.options.fadeDuration + 'ms ease-out';
			setTimeout(function() {
				_self.$elm.style.opacity = 0;
			}, 10);
			setTimeout(function() {
				_self.$elm.style.display = 'none';
				_self.$elm.className = _self.$elm.className.replace( new RegExp( "\\s\*" + _self.options.modalClass ), '' );
				_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.AFTER_CLOSE, _self.getContext() ) );
			}, 10 + _self.options.fadeDuration );
		}
		else {
			_self.$elm.style.display = 'none';
			_self.$elm.className = _self.$elm.className.replace( new RegExp( "\\s\*" + _self.options.modalClass ), '' );
			setTimeout(function() {
				_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.AFTER_CLOSE, _self.getContext() ) );
			}, 10);

		}
		_self.$elm.dispatchEvent( new CustomEvent( jModalInst.events.CLOSE, _self.getContext() ) );
	};


	jModal.prototype.showSpinner = function() {
		var _self = this;
		if ( ! _self.options.showSpinner ) {
			return;
		}
		if ( ! _self.spinner ) {
			_self.spinner = _doc.querySelector( '.' + _self.options.modalClass + '-spinner' ) || false;
		}
		if ( ! _self.spinner ) {
			_self.spinner = _doc.createElement( 'div' );
			_self.spinner.className = _self.options.modalClass + '-spinner';
			_self.spinner.innerHTML = _self.options.spinnerHtml;
			_self.$body.appendChild( _self.spinner );
		}
		_self.spinner.style.display = 'block';
	};


	jModal.prototype.hideSpinner = function() {
		var _self = this;
		if ( _self.spinner ) {
			_self.spinner.style.display = 'none';
		}
	};


	//Return context for custom events
	jModal.prototype.getContext = function() {
		var _self = this;
		return {
			bubbles: true,
			detail: {
				elm: _self.$elm,
				$elm: _self.$elm,
				$blocker: _self.$blocker,
				options: _self.options,
				$anchor: _self.anchor
			}
		};
	};


	if ( _doc.readyState && _doc.readyState !== 'loading' ) {
		_doc.addEventListener('click', jModalInst.init );
	}
	else {
		_doc.addEventListener('DOMContentLoaded', function() {
			_doc.addEventListener('click', jModalInst.init );
		});
	}


	_win.jModalInst = jModalInst;

})( window, document );
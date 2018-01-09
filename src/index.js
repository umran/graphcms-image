import React from 'react'
import PropTypes from 'prop-types'

import Img from './Img'
import listenToIntersections from './listenToIntersections'
import isWebpSupported from './isWebpSupported'
import inImageCache from './inImageCache'

const baseURI = 'https://media.graphcms.com/'
const thumbTrans = 'resize=w:20,h:20,fit:crop/blur=amount:2'

const thumbImg = (handle, webp = '') =>
  `${baseURI}${thumbTrans}/${webp && 'output=format:webp/'}compress/${handle}`

const fullImg = (handle, transforms = '', webp = '') =>
  `${baseURI}${transforms}/${webp && 'output=format:webp/'}compress/${handle}`

class Image extends React.Component {
  constructor(props) {
    super(props)

    // If this browser doesn't support the IntersectionObserver API
    // we default to start downloading the image right away.
    let isVisible = true
    let imgLoaded = true
    let IOSupported = false

    // If this image has already been loaded before then we can assume it's
    // in the browser cache so it's cheap to just show directly.
    const seenBefore = inImageCache(props)

    if (
      !seenBefore &&
      typeof window !== `undefined` &&
      window.IntersectionObserver
    ) {
      isVisible = false
      imgLoaded = false
      IOSupported = true
    }

    // Never render image while server rendering
    if (typeof window === `undefined`) {
      isVisible = false
      imgLoaded = false
    }

    this.state = {
      isVisible,
      imgLoaded,
      IOSupported
    }

    this.handleRef = this.handleRef.bind(this)
  }

  handleRef(ref) {
    if (this.state.IOSupported && ref) {
      listenToIntersections(
        ref,
        () => {
          this.setState({ isVisible: true, imgLoaded: false })
        },
        this.props
      )
    }
  }

  render() {
    const {
      title,
      alt,
      className,
      outerWrapperClassName,
      style,
      image: { handle, height, width },
      withWebp,
      transforms,
      blurryPlaceholder,
      backgroundColor
    } = this.props

    let bgColor
    if (typeof backgroundColor === `boolean`) {
      bgColor = `lightgray`
    } else {
      bgColor = backgroundColor
    }

    if (handle) {
      let finalSrc = fullImg(transforms, handle)
      let finalThumb = thumbImg(handle)
      // Use webp by default if browser supports it
      if (isWebpSupported() && withWebp) {
        finalSrc = fullImg(handle, transforms, true)
        finalThumb = thumbImg(handle, true)
      }

      // The outer div is necessary to reset the z-index to 0.
      return (
        <div
          className={`${outerWrapperClassName} graphcms-image-outer-wrapper`}
          style={{
            zIndex: 0,
            // Let users set component to be absolutely positioned.
            position: style.position === 'absolute' ? 'initial' : 'relative'
          }}
        >
          <div
            className={`${className} graphcms-image-wrapper`}
            style={{
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1,
              ...style
            }}
            ref={this.handleRef}
          >
            {/* Preserve the aspect ratio. */}
            <div
              style={{
                width: '100%',
                paddingBottom: `${100 / (width / height)}%`
              }}
            />

            {/* Show the blurry thumbnail image. */}
            {blurryPlaceholder && (
              <Img
                alt={alt}
                title={title}
                src={finalThumb}
                opacity={this.state.imgLoaded ? 0 : 1}
                transitionDelay="0.25s"
              />
            )}

            {/* Show a solid background color. */}
            {bgColor && (
              <div
                title={title}
                style={{
                  backgroundColor: bgColor,
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  opacity: this.state.imgLoaded ? 0 : 1,
                  transitionDelay: '0.25s',
                  right: 0,
                  left: 0
                }}
              />
            )}

            {/* Once the image is visible (or the browser doesn't support IntersectionObserver), start downloading the image */}
            {this.state.isVisible && (
              <Img
                alt={alt}
                title={title}
                src={finalSrc}
                opacity={this.state.imgLoaded || !this.props.fadeIn ? 1 : 0}
                onLoad={() => {
                  this.state.IOSupported && this.setState({ imgLoaded: true })
                  this.props.onLoad && this.props.onLoad()
                }}
              />
            )}
          </div>
        </div>
      )
    }

    return null
  }
}

Image.defaultProps = {
  blurryPlaceholder: true,
  withWebp: true,
  style: {},
  transforms: '',
  fadeIn: true,
  alt: '',
  title: '',
  outerWrapperClassName: '',
  className: '',
  backgroundColor: null,
  onLoad() {}
}

Image.propTypes = {
  image: PropTypes.shape({
    handle: PropTypes.string,
    height: PropTypes.number,
    width: PropTypes.number
  }).isRequired,
  withWebp: PropTypes.bool,
  blurryPlaceholder: PropTypes.bool,
  transforms: PropTypes.string,
  fadeIn: PropTypes.bool,
  title: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), // Support Glamor's css prop.
  outerWrapperClassName: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  style: PropTypes.object,
  backgroundColor: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  onLoad: PropTypes.func
}

export default Image

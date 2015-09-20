precision highp float;
uniform vec2 uTextureSize;
uniform sampler2D uSample0;

uniform int uOrientation;
uniform int uBlurAmount;

varying vec2 vUv;

/// <summary>
/// Gets the Gaussian value in the first dimension.
/// </summary>
/// <param name="x">Distance from origin on the x-axis.</param>
/// <param name="deviation">Standard deviation.</param>
/// <returns>The gaussian value on the x-axis.</returns>
float Gaussian (float x, float deviation)
{
	return (1.0 / sqrt(2.0 * 3.141592 * deviation)) * exp(-((x * x) / (2.0 * deviation)));
}


/// <summary>
/// Fragment shader entry.
/// <summary>
void main ()
{
	//float halfBlur = float(BlurAmount) * 0.5;
	//float deviation = halfBlur * 0.5;
	vec4 colour = vec4(0.0);

	const int blur = 3;
	float halfBlur = float(blur) * 0.5;

	if (uOrientation == 0)
	{
		// Blur horizontal
		for (int i = 0; i < blur; ++i)
		{
			//if ( i >= BlurAmount )
			//	break;

			float offset = (float(i) - halfBlur);
			colour += texture2D(uSample0, vUv + vec2(offset * uTextureSize.x, 0.0)) /* Gaussian(offset, deviation)*/;
			//colour += vec4(0.0, 0.0, 0.0, 1.0);
		}
        colour = colour / float(blur);
	}
	else if(uOrientation == 1) {
		// Blur vertical
		for (int i = 0; i < blur; ++i)
		{
			//if ( i >= BlurAmount )
			//	break;

			float offset = (float(i) - halfBlur);
			colour += texture2D(uSample0, vUv + vec2(0.0, offset * uTextureSize.y)) /* Gaussian(offset, deviation)*/;
		}
        colour = colour / float(blur);
	} else {
        // box
        int a = 0;
        for(int x=-1; x<=1; x++){
            for(int y=-1; y<=1; y++){
                colour += texture2D(uSample0, vUv + vec2(x, y) * uTextureSize.xy);
                a++;
            }
        }
        colour = colour/9.0;
    }

	// Apply colour
	gl_FragColor = vec4(colour.xyz, 1.0);
}

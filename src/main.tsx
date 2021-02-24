import { ActiveInterface, AvHeadFacingTransform, AvInterfaceEntity, AvLine, AvModel, AvPanel, AvStandardGrabbable, AvTransform, GrabbableStyle, renderAardvarkRoot, ShowGrabbableChildren } from '@aardvarkxr/aardvark-react';
import { AvColor, AvVolume, emptyVolume, EndpointAddr, sphereVolume } from '@aardvarkxr/aardvark-shared';
import bind from 'bind-decorator';
import * as React from 'react';

const k_protractor = "models/protractor.glb";
const k_square = "models/square_ruler.glb";
const k_cone = "models/unit_cone.glb";

interface ConeProps
{
	radius: number;
	height: number;
	color: string | AvColor;
}

function Cone( props:ConeProps )
{
	return <AvTransform scaleX={ props.radius * 10 } scaleZ={ props.radius * 10 }
		scaleY={ props.height * 10 } 
		rotateX={ 180 }>
			<AvModel color={ props.color } uri={ k_cone }/>
		</AvTransform>;
}

interface SquareIndicatorProps
{
	baseEpa: EndpointAddr;
}

interface SquareIndicatorState
{
	activeSquare: ActiveInterface;
}

const k_rulerSquareIface = "aardvark-ruler-square@1";
const k_rulerProtractorIface = "aardvark-ruler-protractor@1";

class SquareIndicator extends React.Component< SquareIndicatorProps, SquareIndicatorState >
{

	constructor( props: any )
	{
		super( props );

		this.state =
		{
			activeSquare: null,
		}
	}

	@bind
	private onSquare( activeSquare: ActiveInterface )
	{
		this.setState( { activeSquare } );

		activeSquare.onTransformUpdated( () => this.forceUpdate() );

		activeSquare.onEnded( () =>
		{
			this.setState( { activeSquare: null } );
		} );
	}

	private renderIndicator()
	{
		if( !this.state.activeSquare )
			return null;

		let pos = this.state.activeSquare.selfFromPeer.position;
		let dist = Math.sqrt( pos.x * pos.x + pos.y * pos.y + pos.z * pos.z );

		return <AvTransform rotateX={0}>
			<AvHeadFacingTransform>
				<AvTransform translateY={ 0.02 } translateZ={ 0.01 }>
					<AvPanel widthInMeters={ 0.08 }>
						<div className="Label">{ ( dist * 100 ).toFixed( 1 ) }cm</div>
					</AvPanel>
				</AvTransform>
			</AvHeadFacingTransform>
			<AvTransform rotateX={ -90 }>
				<Cone radius={ 0.01 } height={ 0.02 } color="blue"/>
			</AvTransform>
			<AvLine endId={ this.props.baseEpa } startGap={ 0.02 } endGap={ 0.02 }/>
		</AvTransform>
	}

	render()
	{
		return <AvInterfaceEntity 
			wantsTransforms={ true } 
			volume={ emptyVolume() }
			transmits={ [
				{
					iface: k_rulerSquareIface,
					processor: this.onSquare,
				}
			]}  
			interfaceLocks={ 
			[ 
				{ 
					iface: k_rulerSquareIface,
					receiver: this.props.baseEpa,
				}
			] } >
			{ this.renderIndicator() }
			</AvInterfaceEntity>;
	}
}


enum EActiveRuler
{
	None,
	Square,
	Protractor,
}

interface RulerState
{
	grabbed: boolean;
	active: EActiveRuler;
}

class Ruler extends React.Component< {}, RulerState >
{
	private baseRef = React.createRef<AvInterfaceEntity>();

	constructor( props: any )
	{
		super( props );
		this.state = 
		{
			grabbed: false,
			active: EActiveRuler.None,
		};
	}

	public renderHandle()
	{
		if( this.state.active != EActiveRuler.None  || this.state.grabbed )
			return null;

		return <AvTransform uniformScale={ 0.3 } rotateX={ 90 }>
			<AvModel uri={ k_square } />
		</AvTransform>;
	}

	public renderSquare()
	{
		if( !this.baseRef.current )
			return null;

		let visible = this.state.active == EActiveRuler.None || this.state.active == EActiveRuler.Square;

		let appearance;
		if( this.state.active == EActiveRuler.Square )
		{
			appearance = null;
		}
		else
		{
			appearance = <AvTransform uniformScale={ 0.3 }>
				<AvModel uri={ k_square }/>
			</AvTransform>;
		}

		return	<AvTransform visible={ visible }>
			<AvStandardGrabbable style={ GrabbableStyle.LocalItem } 
				appearance={ appearance } canDropIntoContainers={ false }
				volume={ sphereVolume( 0.03 ) }
				showChildren={ ShowGrabbableChildren.OnlyWhenGrabbed }
				onGrab={ () => { this.setState( { active: EActiveRuler.Square } ) } }
				onEndGrab={ () => { this.setState( { active: EActiveRuler.None } ) } }
				grabberFromGrabbable={ {} }
				>
				<AvTransform translateY={0.10}>
					{ this.state.active == EActiveRuler.Square 
						&& <SquareIndicator baseEpa={ this.baseRef.current.globalId }/> }
				</AvTransform>
			</AvStandardGrabbable>
		</AvTransform>

	}

	public renderProtractor()
	{
		if( !this.baseRef.current )
			return null;

		let visible = this.state.active == EActiveRuler.None || this.state.active == EActiveRuler.Protractor;
		let appearance = <AvModel uri={ k_square }/>;

		return <AvTransform visible={ visible }>
			<AvStandardGrabbable style={ GrabbableStyle.LocalItem } modelUri={ k_protractor }
				canDropIntoContainers={ false }
				onGrab={ () => { this.setState( { active: EActiveRuler.Protractor } ) } }
				onEndGrab={ () => { this.setState( { active: EActiveRuler.None } ) } }
				grabberFromGrabbable={ {} }
				/>
			</AvTransform>;
	}

	private renderBase()
	{
		return <AvTransform translateY={ 0.10 }>
			<AvInterfaceEntity volume={emptyVolume() }
				ref={ this.baseRef }
				receives={ [
					{
						iface: k_rulerSquareIface,
						processor: null,
					},
					{
						iface: k_rulerProtractorIface,
						processor: null,
					}
				]} />
			{ this.state.active != EActiveRuler.None &&
				<AvTransform rotateX={ 0 } >
					<Cone radius={ 0.01 } height={ 0.02 } color="red"/> 
				</AvTransform>	}
		</AvTransform>
	}

	public render()
	{
		return (
			<AvStandardGrabbable appearance={ this.renderHandle() }
				style={ GrabbableStyle.Gadget } volume={ sphereVolume( 0.015 ) }
				showChildren={ ShowGrabbableChildren.OnlyWhenGrabbed }
				onGrab={ () => { this.setState( { grabbed: true } ) } } 
				onEndGrab={ () => { this.setState( { grabbed: false, active: EActiveRuler.None } ) } } 
				>

				<AvTransform rotateX={ 90 }>
					<AvTransform translateZ={ -0.09 } translateX={ -0.08 }>
						{ false && this.renderProtractor() }
					</AvTransform>
					
					{/* <AvTransform translateZ={ -0.10 } translateX={ 0.09 }> */}
					<AvTransform translateZ={ -0.09 } translateX={ 0 }>
						{ this.renderSquare() }
					</AvTransform>
				</AvTransform>

				{ this.renderBase() }
			</AvStandardGrabbable>
			);
	}

}

renderAardvarkRoot( "root", <Ruler/> );

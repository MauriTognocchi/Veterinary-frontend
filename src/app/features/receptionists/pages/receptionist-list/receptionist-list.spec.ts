import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReceptionistList } from './receptionist-list';

describe('ReceptionistList', () => {
  let component: ReceptionistList;
  let fixture: ComponentFixture<ReceptionistList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistList],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionistList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

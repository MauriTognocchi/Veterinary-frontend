import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConditionList } from './condition-list';

describe('ConditionList', () => {
  let component: ConditionList;
  let fixture: ComponentFixture<ConditionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConditionList],
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
